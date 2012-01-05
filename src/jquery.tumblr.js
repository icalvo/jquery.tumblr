(function($) {
    $.tumblrReader = function(domain, apiKey, notifyPostCallback, options) {
        
        // OPTIONS VARIABLES
        // =============================================
        var category = null;
        var limit = null;
        var type = null;
        var tags = null;
        var negativeTags = null;
        var filterExpression = null;
        var statusCallback = null;
        var successCallback = null;

        // PRIVATE VARIABLES
        // =============================================
        var offset = null;
        var totalReadCount = null;
        var bestTagCount = null;
        var bestTagIndex = null;
        var postPredicate = null;
        var postPredicateExpression = null;
        var postPredicateTagLists = null;
        var currentPost = null;

        // MAIN BODY
        // =============================================

        // Initialize
        // ---------------------------------------------
        opts = $.extend({}, $.tumblrReader.defaults, options);
        category = opts['category'];
        limit = opts.limit;
        type = opts.type;
        tags = opts.tags;
        negativeTags = opts.negativeTags;
        filterExpression = opts.filterExpression;
        statusCallback = opts.statusCallback;
        successCallback = opts.successCallback;

        offset = 0;
        totalReadCount = 0;
        bestTagCount = 0;
        bestTagIndex = -1;

        postPredicateExpression = getPredicateFromExpression();
        postPredicateTagLists = getPredicateFromTagLists();
        postPredicate = function (post) {
            return postPredicateExpression(post) && postPredicateTagLists(post);
        };

        
        // Start things
        // ---------------------------------------------
        // Locate tag with least number of posts and then
        // read posts
        startReadTags(function() {
            status("Reading posts for tag {0}...", getBestTagName());
            startReadPosts();
        });

        // PRIVATE FUNCTIONS
        // =============================================
        
        // Gets tag name of some of the given tags. If tagidx == -1, return "*"
        function getTagName(tagidx) {
            return (tagidx == -1? "*": tags[tagidx]);
        }
        
        // Gets tag name of some of the best tag (tag with least posts). If tagidx == -1, return "*"
        function getBestTagName() {
            return getTagName(bestTagIndex);
        }
        
        // Calls the status callback with a possibly formatted message
        function status() {
            if (!statusCallback) {
                return;
            }
            msg = arguments[0];
            if (arguments.length > 1) {
                args = Array.prototype.slice.call(arguments);
                msg = $.basics.format.apply(msg, args.slice(1));
            }
            statusCallback(msg);
        }
        
        function startReadTags(allFinishedCallback) {
            status("Locating tag with less posts...");
            if (category == "published" && tags.length > 0) {
                startReadTagsAux(0, allFinishedCallback);
            }
            else {
                allFinishedCallback();
            }
        }

        function startReadTagsAux(tagIndex, allFinishedCallback) {
            return getJSON(1, 0, tagIndex).success(function(data) { successReadTags(tagIndex, allFinishedCallback, data) });
        }

        function successReadTags(tagIndex, allFinishedCallback, data) {
            if (data.meta.status != 200) {
                throw new Error("Invalid response from Tumblr");
            }
            if (tagIndex == 0 || data.response.total_posts < bestTagCount) {
                bestTagCount = data.response.total_posts;
                bestTagIndex = tagIndex;
                status("Found better tag {0} ({1} posts)", getBestTagName(), bestTagCount);
            }
            else {
                status("Tag {0} ({1} posts)", getTagName(tagIndex), data.response.total_posts);
            }
            if (bestTagCount > 1 && tagIndex + 1 < tags.length) {
                startReadTagsAux(tagIndex + 1, allFinishedCallback);
            }
            else {
                allFinishedCallback();
            }
        }
        
        function getJSON(limit, offset, tagIndex) {
            switch (category) {            
            case "queue":
            case "draft":
            case "submission":
                tpl = 'http://api.tumblr.com/v2/blog/{0}/posts/{1}';
                // TODO: OAuth
            break;
            case "published":
                status("Offset {0}", offset);
                if (tagIndex == -1) {
                    tpl = 'http://api.tumblr.com/v2/blog/{0}/posts?api_key={1}&limit={2}&offset={3}{4}&jsonp=?';
                    uri = $.basics.format(tpl,
                        domain,
                        apiKey,
                        limit,
                        offset,
                        type==""?"":"type="+type);
                }
                else {
                    tpl = 'http://api.tumblr.com/v2/blog/{0}/posts?api_key={1}&limit={2}&offset={3}{4}&tag={5}&jsonp=?';
                    tag = tags[tagIndex].replace(" ", "%20");
                    uri = $.basics.format(tpl,
                        domain,
                        apiKey,
                        limit,
                        offset,
                        type==""?"":"type="+type,
                        tag);
                }
                break;
            }
            
            return $.getJSON(uri);
        }
        
        function startReadPosts() {
            getJSON(limit, offset, bestTagIndex).success(successReadPosts);
        }
        
        function successReadPosts(data) {
            if (data.meta.status != 200) {
                throw new Error("Invalid response from Tumblr");
            }
            readPosts = data.response.posts;
            
            totalReadCount += readPosts.length;
            status("Read {0} posts with tag {1}... {2}/{3} read",
                readPosts.length,
                getBestTagName(),
                totalReadCount,
                data.response.total_posts);
            filteredCount = 0;
            $.each(readPosts, function(idx, post) {
                currentPost = post;
                currentPost.tagCorrections = new Array();
                currentPost.tagCorrectionsIndexes = new Array();
                if (postPredicate(post, post.tags)) {
                    filteredCount += 1;
                    notifyPostCallback(post);
                }
            });
            
            status("{0} of {1} posts passed the filter", filteredCount, readPosts.length);
            
            if (readPosts.length == 0) {
                status("No posts found");
                return;
            }
            if (totalReadCount < data.response.total_posts) {
                // Still more posts to read
                offset += readPosts.length;
                startReadPosts();
            }
            else {
                status("Finish");
                if (successCallback) {
                    successCallback();
                }
            }
        }

        function getPredicateFromTagLists() {
            if (tags.length == 0 && negativeTags.length == 0) {
                return (function(post) {return true;});
            }
            else {
                return (function (post) {
                    for (i = 0; i < tags.length; i++) {
                        tag = tags[i];
                        if (i != bestTagIndex) {
                            if  ($.inArray(tag, post.tags) == -1) {
                                return false;
                            }
                        }
                    }
                    
                    for(i = 0; i < negativeTags.length; i++) {
                        tag = negativeTags[i].substring(1);
                        if ($.inArray(tag, post.tags) != -1) {
                            return false;
                        }
                    }						
                    
                    return true;
                });
            }
        }
        
        function getPredicateFromExpression() {
            if (filterExpression) {
                return (function(post) {
                    function ruleset() {
                        var result = true;
                        
                        for(var i = 0; i < arguments.length; i++) {
                            
                            result = result && arguments[i];
                            if (!arguments[i]) {
                                currentPost.tagCorrectionsIndexes.push(i);
                            }
                        }
                        return !result;
                    }
                    
                    function tag(tagname) {
                        return ($.inArray(tagname, currentPost.tags) != -1);
                    }
                    
                    function tagrule(cond, tagname) {
                        ruleSatisfied = impl(cond, tag(tagname));
                        if (!ruleSatisfied) {
                            currentPost.tagCorrections.push("Add tag " + tagname);
                        }
                        return (ruleSatisfied);
                    }
                    
                    function impl(a, b) {
                        return (!a || b);
                    }
                    
                    function tagr(tagexpr) {
                        for (i=0; i < currentPost.tags.length; i++) {
                            postTag = currentPost.tags[i];
                            if (tagexpr.test(postTag)) {
                                return true;
                            }
                        }
                        return false;
                    }
                
                    return eval("(" + filterExpression + ")");
                });
            }
            else {
                return (function(post) {return true;});
            }
        };
    }
        
    $.tumblrReader.defaults = {
        // optional
        category: "published",
        limit: 20,
        type: "",
        id: "",
        reblog_info: false,
        notes_info: false,
        tags: new Array(),
        format: "",
        negativeTags: new Array(),
        filterExpression: null,
        statusCallback: null,
        successCallback: null
    };    
})(jQuery);

