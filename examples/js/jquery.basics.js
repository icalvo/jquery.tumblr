(function($) {
    $.basics = new Object();
    
    // A very simple formatting function, replaces positional arguments
    // with format "{n}" with the extra arguments passed to the function.
    $.basics.format = function() {
        if (this.constructor.name == "String") {
            value = this;
            startIdx = 0;
        }
        else {
            value = arguments[0];
            startIdx = 1;
        }
        for (i=startIdx; i<arguments.length; i++) {
            arg = arguments[i];
            value = value.replace("{"+(i-startIdx)+"}", arg);
        }
        return value;
    }

    $.basics.filter = function(arr, fun /*, thisp*/) {
        var len = arr.length;
        if (typeof fun != "function") {
            throw new TypeError();
        }
        var res = new Array();
        var thisp = arguments[1];
        for (var i = 0; i < len; i++) {
            if (i in arr) {
                var val = arr[i]; // in case fun mutates this
                if (fun.call(thisp, val, i, arr)) {
                    res.push(val);
                }
            }
        }
        return res;
    }
})(jQuery);
