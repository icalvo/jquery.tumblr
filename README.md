This jQuery plugin allows to read Tumblr feeds using two advanced filtering techniques that can be combined.

Installation
============
You must add a reference to jQuery and my jquery.basics for this plugin to work.

Documentation
=============

Filtering technique 1: Tag lists
---------
You specify a list of positive tags and a list of negative tags. The plugin will first locate the positive tag with least number of posts, retrieve those posts and then filter those which have **all** the positive tags and **none** of the negative tags.


``` js
function renderPost(post) {
    $("#result").append('<a href="' + post.url + '">' + post.id + '</a><br />');
}

$("#result").html("");
domain = $("#txtTumblrName").val() +  ".tumblr.com";
options = {
    type: "photo",
    filterExpression: "tag('flowers') && post.name.test(/sky/)",
    statusCallback: status,
    successCallback: function() { $("#lblProgressExpression").hide() }
};

$("#lblProgressExpression").show();
$.tumblrReader(domain, apiKey, renderPost, options);
```

Filtering technique 2: JS filter expressions
---------------------
You specify a javascript function to filter posts. A number of handy functions are provided to simplify writing that function. It must be noted that you must supply a string if you want to take advantage of those utility functions.

* `tag(tagname)`: Has the post given tag?
* `tagr(regexp)`: Does any tag of the post matches the given regular expression?
* `impl(a, b)`: Logical implication (Does a imply b?)
* `tagrule(condition, tagname)`: Does condition imply tag(tagname)? In addition, if it fails, a string will be added to the post's `tagCorrections` property to add the given tagname to the post.
* `ruleset(a, b, c...)`: Does any of the given conditions fail?

Post Callback
-------------
The plugin must be provided with a function that will be called each time a downloaded post passes the filters. The callback is passed the post as received from [Tumblr API v2](http://www.tumblr.com/docs/en/api/v2#posts), with the addition of the property `tagCorrections` which is an array filled with the tags that should be added to satisfy all the `tagrule` calls.
