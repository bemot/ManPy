/* ===========================================================================
 * Copyright 2013 Nexedi SA and Contributors
 *
 * This file is part of DREAM.
 *
 * DREAM is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Lesser General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * DREAM is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with DREAM.  If not, see <http://www.gnu.org/licenses/>.
 * ==========================================================================*/

/*global RSVP, rJS, $, jsPlumb, Handlebars, initGadgetMixin,
  loopEventListener, DOMParser*/
/*jslint unparam: true */
(function (RSVP, rJS, $, jsPlumb, Handlebars, initGadgetMixin,
           loopEventListener, DOMParser) {
  "use strict";

  /*jslint nomen: true*/
  var gadget_klass = rJS(window),
    node_template_source = gadget_klass.__template_element
      .getElementById('node-template').innerHTML,
    node_template = Handlebars.compile(node_template_source),
    domParser = new DOMParser();

  function getNodeId(node_container, element_id) {
    var node_id;
    $.each(node_container, function (k, v) {
      if (v.element_id === element_id) {
        node_id = k;
        return false;
      }
    });
    return node_id;
  }

  function getElementId(node_container, node_id) {
    return node_container[node_id].element_id;
  }

  // function generateNodeId(node_container, element_type, option) {
  //   var n = 1;
  //   while (node_container[
  //       ((option.short_id || element_type) + n)
  //     ] !== undefined) {
  //     n += 1;
  //   }
  //   return (option.short_id || element_type) + n;
  // }

  function generateElementId(gadget_element) {
    var n = 1;
    while ($(gadget_element).find('#DreamNode_' + n).length > 0) {
      n += 1;
    }
    return 'DreamNode_' + n;
  }

  function onDataChange() {
    //$.publish("Dream.Gui.onDataChange", g.private.getData());
    return undefined;
  }

  function convertToAbsolutePosition(gadget, x, y) {
    var zoom_level = (gadget.props.preference_container.zoom_level || 1.0) *
        1.1111,
      canvas_size_x = $(gadget.props.element).find('#main').width(),
      canvas_size_y = $(gadget.props.element).find('#main').height(),
      size_x = $(gadget.props.element).find('.dummy_window').width() *
        zoom_level,
      size_y = $(gadget.props.element).find('.dummy_window').height() *
        zoom_level,
      top = Math.floor(y * (canvas_size_y - size_y)) + "px",
      left = Math.floor(x * (canvas_size_x - size_x)) + "px";
    return [left, top];
  }

  function convertToRelativePosition(gadget, x, y) {
    var zoom_level = (gadget.props.preference_container.zoom_level || 1.0) *
        1.1111,
      canvas_size_x = $(gadget.props.element).find('#main').width(),
      canvas_size_y = $(gadget.props.element).find('#main').height(),
      size_x = $(gadget.props.element).find('.dummy_window').width() *
        zoom_level,
      size_y = $(gadget.props.element).find('.dummy_window').height() *
        zoom_level,
      top = Math.max(Math.min(y.replace('px', '') /
                              (canvas_size_y - size_y), 1), 0),
      left = Math.max(Math.min(x.replace('px', '') /
                               (canvas_size_x - size_x), 1), 0);
    return [left, top];
  }

  function updateElementCoordinate(gadget, node_id, coordinate) {
    var element_id = gadget.props.node_container[node_id].element_id,
      coordinates = gadget.props.preference_container.coordinates || {},
      element,
      relative_position;
    if (coordinate === undefined) {
      coordinate = {};
      element = $(gadget.props.element).find("#" + element_id);
      relative_position = convertToRelativePosition(
        gadget,
        element.css('left'),
        element.css('top')
      );
      coordinate.top = relative_position[1];
      coordinate.left = relative_position[0];
    }
    coordinates[node_id] = coordinate;
    gadget.props.preference_container.coordinates = coordinates;
    onDataChange();
    return coordinate;
  }

  function draggable(gadget) {
    var jsplumb_instance = gadget.props.jsplumb_instance,
      stop = function (element) {
        updateElementCoordinate(gadget, getNodeId(
          gadget.props.node_container,
          element.target.id
        ));
      };

    jsplumb_instance
      .draggable(jsplumb_instance.getSelector(".window"), {
        containment: 'parent',
        grid: [10, 10],
        stop: stop // FIXME: we should only accept if dropped in #main
      });

    jsplumb_instance
      .makeSource(jsplumb_instance.getSelector(".window"), {
        filter: ".ep",
        anchor: "Continuous",
        connector: ["StateMachine", {
          curviness: 20
        }],
        connectorStyle: {
          strokeStyle: "#5c96bc",
          lineWidth: 2,
          outlineColor: "transparent",
          outlineWidth: 4
        }
      });

    jsplumb_instance
      .makeTarget(jsplumb_instance.getSelector(".window"), {
        dropOptions: {
          hoverClass: "dragHover"
        },
        anchor: "Continuous"
      });
  }

  function initJsPlumb(gadget) {
    var jsplumb_instance = gadget.props.jsplumb_instance;

    jsplumb_instance.setRenderMode(jsplumb_instance.SVG);
    jsplumb_instance.importDefaults({
      HoverPaintStyle: {
        strokeStyle: "#1e8151",
        lineWidth: 2
      },
      Endpoint: ["Dot", {
        radius: 2
      }],
      ConnectionOverlays: [
        ["Arrow", {
          location: 1,
          id: "arrow",
          length: 14,
          foldback: 0.8
        }]
      ],
      Container: "main"
    });

    // listen for clicks on connections,
    // and offer to change values on click.
    // jsplumb_instance.bind("click", function (conn) {
    //   jsplumb_instance.detach(conn);
    // });

    // jsplumb_instance.bind("beforeDetach", function (conn) {
    //   return confirm("Delete connection?");
    // });

    // jsplumb_instance
    //   .bind("connectionDrag", function (connection) {
    //     return undefined;
    //   });

    // jsplumb_instance
    //   .bind("connectionDragStop", function (connection) {
    //     return undefined;
    //   });
    // split in 2 methods ? one for events one for manip
    gadget.props.updateConnectionData
      = function (connection, remove, edge_data) {
        if (remove) {
          delete gadget.props.edge_container[connection.id];
        } else {
          gadget.props.edge_container[connection.id] = [
            getNodeId(gadget.props.node_container, connection.sourceId),
            getNodeId(gadget.props.node_container, connection.targetId),
            edge_data || {}
          ];
        }
        onDataChange();
      };

    // bind to connection/connectionDetached events,
    // and update the list of connections on screen.
    // jsplumb_instance
    //   .bind("connection", function (info, originalEvent) {
    //     gadget.props.updateConnectionData(info.connection);
    //   });
    // jsplumb_instance
    //   .bind("connectionDetached", function (info, originalEvent) {
    //     gadget.props.updateConnectionData(info.connection, true);
    //   });
    onDataChange();
    draggable(gadget);
  }

  function updateNodeStyle(gadget, element_id) {
    var zoom_level = (gadget.props.preference_container.zoom_level || 1.0) *
        1.1111,
      element = $(gadget.props.element).find("#" + element_id),
      new_value;
    $.each(gadget.props.style_attr_list, function (i, j) {
      new_value = $(gadget.props.element).find('.dummy_window').css(j)
        .replace('px', '') * zoom_level + 'px';
      element.css(j, new_value);
    });
  }

  function addElementToContainer(node_container, element) {
    // Now update the container of elements
    /*jslint nomen: true*/
    var element_data = {
      _class: element._class,
      element_id: element.element_id
    };
    node_container[element.id] = element_data;
  }

  // function redraw(gadget) {
  //   var coordinates = gadget.props.preference_container.coordinates || {},
  //     absolute_position,
  //     element;
  //   $.each(coordinates, function (node_id, v) {
  //     absolute_position = convertToAbsolutePosition(
  //       gadget,
  //       v.left,
  //       v.top
  //     );
  //     element = $(gadget.props.element).find(
  //       '#' + getElementId(gadget.props.node_container, node_id)
  //     );
  //     element.css('top', absolute_position[1]);
  //     element.css('left', absolute_position[0]);
  //     gadget.props.jsplumb_instance.repaint(element);
  //   });
  // }

  // function positionGraph(gadget) {
  //   $.ajax(
  //     '/positionGraph',
  //     {
  //       data: JSON.stringify(getData()),
  //       contentType: 'application/json',
  //       type: 'POST',
  //       success: function (data, textStatus, jqXHR) {
  //         $.each(data, function (node, pos) {
  //           convertToAbsolutePosition(
  //             gadget,
  //             pos.left,
  //             pos.top
  //           );
  //           updateElementCoordinate(gadget, node, {
  //             top: pos.top,
  //             left: pos.left
  //           });
  //         });
  //         redraw(gadget);
  //       }
  //     }
  //   );
  // }

  // function setZoom(gadget, zoom_level) {
  //   $.each(gadget.props.style_attr_list, function (i, j) {
  //     var new_value = $(gadget.props.element).find('.dummy_window')
  //       .css(j).replace('px', '') * zoom_level + 'px';
  //     $(gadget.props.element).find('.window').css(j, new_value);
  //   });
  // }

  // function zoom_in(gadget) {
  // var zoom_level = (gadget.props.preference_container.zoom_level || 1.0) *
  //       1.1111;
  //   setZoom(gadget, zoom_level);
  //   gadget.props.preference_container.zoom_level = zoom_level;
  //   onDataChange();
  //   redraw(gadget);
  // }

  // function zoom_out(gadget) {
  // var zoom_level = (gadget.props.preference_container.zoom_level || 1.0) *
  //     0.9;
  //   setZoom(gadget, zoom_level);
  //   gadget.props.preference_container.zoom_level = zoom_level;
  //   onDataChange();
  //   redraw(gadget);
  // }


  // function removeElement(gadget, node_id) {
  //   var element_id = gadget.props.node_container[node_id].element_id;
  //   gadget.props.jsplumb_instance.removeAllEndpoints(
  //     $(gadget.props.element).find("#" + element_id)
  //   );
  //   $(gadget.props.element).find("#" + element_id).remove();
  //   delete gadget.props.node_container[node_id];
  //   delete gadget.props.preference_container.coordinates[node_id];
  //   $.each(gadget.props.edge_container, function (k, v) {
  //     if (node_id === v[0] || node_id === v[1]) {
  //       delete gadget.props.edge_container[k];
  //     }
  //   });
  //   onDataChange();
  // }

  function updateElementData(gadget, node_id, data) {
    var element_id = gadget.props.node_container[node_id].element_id,
      new_id = data.id;
    if (data.name) {
      $(gadget.props.element).find("#" + element_id).text(data.name)
        .append('<div class="ep"></div></div>');
      gadget.props.node_container[node_id].name = data.name;
    }
    delete data.id;
    $.extend(gadget.props.node_container[node_id], data.data);
    if (new_id && new_id !== node_id) {
      gadget.props.node_container[new_id]
        = gadget.props.node_container[node_id];
      delete gadget.props.node_container[node_id];
      $.each(gadget.props.edge_container, function (k, v) {
        if (v[0] === node_id) {
          v[0] = new_id;
        }
        if (v[1] === node_id) {
          v[1] = new_id;
        }
      });
      gadget.props.preference_container.coordinates[new_id]
        = gadget.props.preference_container.coordinates[node_id];
      delete gadget.props.preference_container.coordinates[node_id];
    }
    onDataChange();
  }

  // function clearAll(gadget) {
  //   $.each(gadget.props.node_container, function (node_id) {
  //     removeElement(gadget, node_id);
  //   });
  //   // delete anything if still remains
  //   $(gadget.props.element).find("#main").children().remove();
  //   gadget.props.node_container = {};
  //   gadget.props.edge_container = {};
  //   gadget.props.preference_container = {};
  //   gadget.props.general_container = {};
  //   gadget.props.initGeneralProperties();
  //   gadget.props.prepareDialogForGeneralProperties();
  // }

  function addEdge(gadget, edge_id, edge_data) {
    var source_id = edge_data[0],
      target_id = edge_data[1],
      data = edge_data[2],
      overlays = [],
      connection;
    if (data && data.title) {
      overlays = [["Label", {
        cssClass: "l1 component label",
        label: data.title
      }]];
    }
    connection = gadget.props.jsplumb_instance.connect({
      source: getElementId(gadget.props.node_container, source_id),
      target: getElementId(gadget.props.node_container, target_id),
      Connector: [ "Bezier", {curviness: 75} ],
      overlays: overlays
    });
    // call again updateConnectionData to set the connection data that
    // was not passed to the connection hook
    gadget.props.updateConnectionData(connection, 0, data);
  }

  // function setPreferences(gadget, preferences) {
  //   gadget.props.preference_container = preferences;
  //   var zoom_level = gadget.props.preference_container.zoom_level || 1.0;
  //   setZoom(gadget, zoom_level);
  // }

  // function setGeneralProperties(gadget, properties) {
  //   gadget.props.general_container = properties;
  //   onDataChange();
  // }

  // function updateGeneralProperties(gadget, properties) {
  //   $.extend(gadget.props.general_container, properties);
  //   onDataChange();
  // }

  function newElement(gadget, element, option) {
    element.name = element.name || option.name;
    addElementToContainer(gadget.props.node_container, element);
    var render_element = $(gadget.props.element).find("#main"),
      coordinate = element.coordinate,
      box,
      absolute_position;
    if (coordinate !== undefined) {
      coordinate = updateElementCoordinate(
        gadget,
        element.id,
        coordinate
      );
    }
    if (element.element_id === undefined) {
      element.element_id = generateElementId(gadget.props.element);
    }
    /*jslint nomen: true*/
    render_element.append(node_template({
      "class": element._class.replace('.', '-'),
      "element_id": element.element_id,
      "title": element.name || element.id,
      "id": element.id
    }));
    box = $(gadget.props.element).find("#" + element.element_id);
    absolute_position = convertToAbsolutePosition(
      gadget,
      coordinate.left,
      coordinate.top
    );
    box.css("top", absolute_position[1]);
    box.css("left", absolute_position[0]);
    updateNodeStyle(gadget, element.element_id);
    draggable(gadget);
    onDataChange();
  }

  function waitForDragover(gadget) {
    return loopEventListener(
      gadget.props.main,
      'dragover',
      false,
      function () {return undefined; }
    );
  }

  function waitForDrop(gadget) {

    var target = gadget.props.element
      .querySelector('#main'),
      callback;

    function canceller() {
      if (callback !== undefined) {
        target.removeEventListener('drop', callback, false);
      }
    }

    function nonResolvableTrap(resolve, reject) {

      callback = function (evt) {
        var element = domParser.parseFromString(
          evt.dataTransfer.getData('text/html'),
          'text/html'
        ).querySelector(".tool"),
          offset = $(gadget.props.main).offset(),
          box_top = evt.clientY - offset.top + "px",
          box_left = evt.clientX - offset.left + "px",
          element_class = element.id.replace('-', '.'),
          relative_position = convertToRelativePosition(
            gadget,
            box_left,
            box_top
          );
        newElement(gadget, {
          coordinate: {
            left: relative_position[0],
            top: relative_position[1]
          },
          "_class": element_class,
          "name": element_class
        });
      };

      target.addEventListener('drop', callback, false);
    }

    return new RSVP.Promise(nonResolvableTrap, canceller);
  }

  initGadgetMixin(gadget_klass);
  gadget_klass
    .ready(function (g) {
      g.props.node_container = {};
      g.props.edge_container = {};
      g.props.preference_container = {};
      g.props.style_attr_list = [
        'width',
        'height',
        'padding-top',
        'line-height'
      ];
    })

    .declareMethod('render', function (data) {
      this.props.data = JSON.parse(data);
      this.props.jsplumb_instance = jsPlumb.getInstance();
    })

    .declareMethod('getData', function () {
      return JSON.stringify({
        "nodes": this.props.node_container,
        "edges": this.props.edge_container,
        "preference": this.props.preference_container
      });
    })

    .declareMethod('startService', function () {
      var g = this,
        preference = g.props.data.preference !== undefined ?
            g.props.data.preference : {},
        coordinates = preference.coordinates;

      g.props.main = g.props.element.querySelector('#main');
      initJsPlumb(g);
      $.each(g.props.data.nodes, function (key, value) {
        if (coordinates === undefined || coordinates[key] === undefined) {
          value.coordinate = {
            'top': 0.0,
            'left': 0.0
          };
        } else {
          value.coordinate = coordinates[key];
        }
        value.id = key;
        newElement(g, value);
        if (value.data) { // backward compatibility
          updateElementData(g, key, {
            data: value.data
          });
        }
      });
      $.each(g.props.data.edges, function (key, value) {
        addEdge(g, key, value);
      });
      return RSVP.all([
        waitForDragover(g),
        waitForDrop(g)
      ]);
    });
}(RSVP, rJS, $, jsPlumb, Handlebars, initGadgetMixin,
  loopEventListener, DOMParser));
