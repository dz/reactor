(function($, _) {
  var Reactions = window.Reactions || {};
  var Settings = window.Settings || {};
  var Template = window.Template || {};

  var types = ["like", "love", "angry", "sad", "haha", "wow"];
  var labels = {};
  var $panel;
  var graphUrl = "https://graph.facebook.com/v2.8/";

  var cached_data = {};

  Template = {
    initial: {
      number: function() {
        var reactionTemplate = _.template($('#template_number-reaction_item').html());
        var $root = $('#template_number #reactions');
        $root.html(_.map(Settings.visibleReactions(), function(t) {
          return reactionTemplate({
            reaction_type: t
          })
        }).join(""));

        // apply styling lol
        $root.find('.bg-primary-color').css('background-color', Settings.options.primary_color);
      },
      pie: function(data) {
        var $root = $('#template_bar #template_bar_chart');
      }
    },
    update: {
      number: function(data) {
        var $root = $('#template_number');
        _.map(Settings.visibleReactions(), function(t) {
          // look for count data
          if (!!data[t] && !!data[t].summary && !!data[t].summary.total_count) {
            $root.find('#reaction-' + t + ' .counter').html(data[t].summary.total_count)
          }
        });
      },
      pie: function(data) {

      }
    }
  }
  window.Template = Template;

  // Settings
  Settings = {
    changed: false,
    defaults: {
      template: "number",
      post_id: "",
      primary_color: "#333",
      access_token: "xxxxxxxxxxxxxxxxxx",
      show_like: "true",
      show_love: "true",
      show_angry: "true",
      show_sad: "true",
      show_haha: "true",
      show_wow: "true"
    },
    options: {},
    visibleReactions: function() {
      var reactions = [];
      _.each(types, function(reaction) {
        var value = Settings.options["show_" + reaction];
        if (value == "true") {
          reactions.push(reaction)
        }
      });
      return reactions;
    },
    serializeToUrl: function() {
      var params = {};

      // capture plain values
      $panel.find('input.plain').each(function() {
        var val = $(this).val();
        var name = $(this).attr('name');
        params[name] = val;
      });

      // serialize reactions wanted
      $panel.find('#panel_reactions input[type="checkbox"]').each(function() {
        var name = $(this).attr('name');
        var checked = $(this).prop('checked');
        params[name] = checked;
      });

      // serialize template
      params["template"] = $panel.find('#setting_template').val();

      // serialize to querystring
      var qs = $.param(params);

      // update browser location with new params
      var newurl = window.location.protocol + "//" + window.location.host + window.location.pathname + '?' + qs;
      window.history.pushState({ path: newurl }, '', newurl);
    },
    updateFromUrl: function() {
      var params = _.fromPairs(_.compact(_.map(location.search.slice(1).split('&'), function(i) {  if (i) return _.map(i.split('='), function(i2) { return decodeURIComponent(i2); }); })));
      Settings.options = _.defaults(params, Settings.defaults);

      // if the defaults don't match the options
      // meaning params were passed, so changed
      if (!_.isEqual(Settings.defaults, Settings.options)) {
        Settings.changed = true;
      }

      // plain stuff
      $panel.find('input[type="text"].plain').each(function() {
        var name = $(this).attr('name');
        var value = Settings.options[name];
        $(this).val(value);
      });

      // reactions boxes
      $panel.find('#panel_reactions input[type="checkbox"]').each(function() {
        var name = $(this).attr('name');
        var value = Settings.options[name];
        $(this).prop('checked', value === "true");
      });

      //template
      $panel.find('#setting_template').val(Settings.options["template"]);

      // update templates just in case
      _renderReactions();
      _.each(_.values(Template.update), function(f) {
        f(cached_data);
      });

      // show the visible template
      $('div.template').hide();
      $('#template_' + Settings.options['template']).show();
    },
    saveChanges: function() {
      Settings.serializeToUrl($panel);
      Settings.updateFromUrl();
    },
    init: function(elem) {
      $panel = $(elem);
      $panel.draggable();

      // bind keypresses for settings panel
      $(window).keydown(function(e) {
        // escape
        if (e.which == 27) {
          $panel.hide();
        } else {
          $panel.show();
        }
      });
      $panel.find('#panel_close').click(function() {
        $panel.hide();
      });

      Settings.updateFromUrl();
      Settings.serializeToUrl($panel);

      // every time we change something, save the changes to the url
      $panel.find('input, select').change(function() { Settings.saveChanges($panel); });

      // if the panel is not changed, show it by default
      if (!Settings.changed) {
        $panel.show();
      }
    }
  };
  window.Settings = Settings;

  var _renderReactions = function() {
    _.each(_.values(Template.initial), function(f) {
      f();
    });
  };

  var _reactionQuery = function() {
    var generator = _.template("reactions.type(<%= type.toUpperCase() %>).limit(0).summary(true).as(<%= type %>)");
    return _.map(types, function(t) { return generator({ type: t }); }).join(",")
  };

  var _fetchReactions = function(callback) {
    var queryUrl = graphUrl + Settings.options.post_id + "?fields=" + _reactionQuery() + "&access_token=" + Settings.options.access_token;
    $.getJSON(queryUrl, function(data) {
      callback(data);
    })
  };

  var _updateReactions = function() {
    _fetchReactions(function(data) {
      cached_data = data;
      _.each(_.values(Template.update), function(f) {
        f(cached_data);
      });
      setTimeout(_updateReactions, 3000);
    })
  };

  Reactions = {
    init: function(elem) {
      $root = $(elem);
      _renderReactions();
      // call once to get the BALL ROLLING
      _updateReactions();
    }
  };
  window.Reactions = Reactions;
})(jQuery, _.noConflict());
