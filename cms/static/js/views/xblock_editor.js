define(["jquery", "underscore", "gettext", "js/views/feedback_notification", "js/views/xblock",
    "js/views/metadata", "js/collections/metadata"],
    function ($, _, gettext, NotificationView, XBlockView, MetadataView, MetadataCollection) {

        var XBlockEditorView = XBlockView.extend({
            // takes XBlockInfo as a model

            mode: 'editor-mode',

            options: $.extend({}, XBlockView.prototype.options, {
                view: 'studio_view'
            }),

            initialize: function() {
                XBlockView.prototype.initialize.call(this);
                this.view = this.options.view;
            },

            xblockReady: function(xblock) {
                XBlockView.prototype.xblockReady.call(this, xblock);
                this.createMetadataView();
            },

            createMetadataView: function() {
                var metadataEditor = this.$('.metadata_edit'),
                    metadataData = metadataEditor.data('metadata'),
                    models = [],
                    key,
                    xblock = this.xblock;
                for (key in metadataData) {
                    if (metadataData.hasOwnProperty(key)) {
                        models.push(metadataData[key]);
                    }
                }
                this.settingsView = new MetadataView.Editor({
                    el: metadataEditor,
                    collection: new MetadataCollection(models)
                });
                if (xblock.setMetadataEditor) {
                    xblock.setMetadataEditor(this.settingsView);
                }
                if (this.hasDataEditor()) {
                    this.selectMode('editor');
                } else {
                    this.selectMode('settings');
                }
            },

            hasDataEditor: function() {
                return this.$('.wrapper-comp-editor').length > 0;
            },

            save: function(options) {
                var data,
                    saving,
                    self = this,
                    xblock = this.xblock,
                    xblockInfo = this.model,
                    settingsView = this.settingsView;
                data = xblock.save();
                analytics.track("Saved Module", {
                    course: course_location_analytics,
                    id: xblock.id
                });
                data.metadata = _.extend(data.metadata || {}, settingsView.getModifiedMetadataValues());
                saving = new NotificationView.Mini({
                    title: gettext('Saving&hellip;')
                });
                saving.show();
                return xblockInfo.save(data).done(function() {
                    var success = options.success;
                    saving.hide();
                    if (success) {
                        success();
                    }
                });
            },

            selectMode: function(mode) {
                var showEditor = mode === 'editor',
                    dataEditor,
                    settingsEditor;
                dataEditor = this.$('.wrapper-comp-editor');
                settingsEditor = this.$('.wrapper-comp-settings');
                if (showEditor) {
                    dataEditor.removeClass('is-inactive');
                    settingsEditor.removeClass('is-active');
                } else {
                    dataEditor.addClass('is-inactive');
                    settingsEditor.addClass('is-active');
                }
            }
        });

        return XBlockEditorView;
    }); // end define();
