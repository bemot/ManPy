/*global window, document, RSVP, rJS, initGadgetMixin*/
(function(window, document, RSVP, rJS, initGadgetMixin) {
    "use strict";
    /*jslint nomen: true*/
    var gadget_klass = rJS(window);
    function waitForDragstart(tool) {
        var callback;
        function canceller() {
            if (callback !== undefined) {
                tool.removeEventListener("dragstart", callback, false);
            }
        }
        /*jslint unparam: true*/
        function itsANonResolvableTrap(resolve, reject) {
            callback = function(evt) {
                try {
                    evt.dataTransfer.setData("application/json", tool.dataset.class_name);
                } catch (e) {
                    reject(e);
                }
            };
            tool.addEventListener("dragstart", callback, false);
        }
        return new RSVP.Promise(itsANonResolvableTrap, canceller);
    }
    initGadgetMixin(gadget_klass);
    gadget_klass.declareMethod("render", function(json_data) {
        var data = JSON.parse(json_data), tools_container = document.createElement("div");
        /* display all nodes in the palette.
       */
        tools_container.className = "tools-container";
        Object.keys(data.class_definition).forEach(function(key) {
            var _class_object = data.class_definition[key], tool;
            // XXX "expand" the json schema "allOF" etc
            if (_class_object.allOf) {
                if (_class_object.allOf[0].$ref === "#/node") {
                    tool = document.createElement("div");
                    // XXX maybe allow to configure the class name ?
                    tool.className = "tool " + key;
                    tool.textContent = _class_object.name || key;
                    tool.draggable = true;
                    tool.dataset.class_name = JSON.stringify(key);
                    Object.keys(_class_object.css || {}).forEach(function(k) {
                        tool.style[k] = _class_object.css[k];
                    });
                    tools_container.appendChild(tool);
                }
            }
        });
        this.props.element.querySelector(".tools").appendChild(tools_container);
    }).declareMethod("startService", function() {
        var promiseArray = [];
        [].forEach.call(this.props.element.querySelectorAll(".tool"), function(tool) {
            promiseArray.push(waitForDragstart(tool));
        });
        return RSVP.all(promiseArray);
    });
})(window, document, RSVP, rJS, initGadgetMixin);