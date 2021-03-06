;(function($) {
	var
		methods,
		crForm;

	methods = {
		init : function( options ) {
			var $element = $(this);
			if (options == null) {
				options = {};
			}
			// Para que se autoreenderee: nececita que sea llamado desde NULL $(null) y con las properties autoRender y $parentNode
			// Se utiliza en appAjax
			if ($element.length == 0) {
				if (options.autoRender == true && options.$parentNode != null) {
					$element = renderCrForm(options, options.$parentNode);
				}
				else {
					return null;
				}
			}

			if ($element.data('crForm') == null) {
				$element.data('crForm', new crForm($element, options));
			}

			return $element;
		},

		renderCrFormFields: function(fields, $parentNode) { // Para renderear los elementos, en caso de que tengan un container distinto, como crFilterList
			renderCrFormFields(fields, $parentNode);
		},

		renderPopupForm: function(data) {
			return renderPopupForm(data);
		},

		renderAjaxForm: function(data, $parentNode) {
			return renderAjaxForm(data, $parentNode);
		},

		showSubForm: function(controller) {
			$(this).data('crForm').showSubForm(controller);
			return $(this);
		},

		options: function(){
			return $(this).data('crForm').options;
		}
	};

	$.fn.crForm = function( method ) {
		if ( methods[method] ) {
			return methods[ method ].apply( this, Array.prototype.slice.call( arguments, 1 ));
		} else if ( typeof method === 'object' || ! method ) {
			return methods.init.apply( this, arguments );
		} else {
			$.error( 'Method ' +  method + ' does not exist on jQuery.tooltip' );
		}
	};

	crForm = function($form, options) {
		this.$form         = $form;
		this.$btnSubmit    = this.$form.find('button[type=submit]');
		this.options       = $.extend({
			sendWithAjax:  true,
			fields:        [],
			rules:         []
		}, options );

		this.initFields();
		this.initCallbacks();
		this.resizeWindow();

		this.options.urlSave = this.$form.attr('action');

		this.$form.find('.formButtons .btn-danger').click($.proxy(
			function(event) {
				event.stopPropagation();

				$(document).crAlert( {
					'msg':        crLang.line('Are you sure?'),
					'isConfirm':  true,
					'callback':   $.proxy(
						function() {
							this.$form.attr('action', this.options.urlDelete);
							this.sendForm();
						}
					, this)
				});

				return false;
			}
		, this));

		this.$form.on('submit', $.proxy(
				function() {
					if ( !this.validate() ) {
						return false;
					}

					this.$form.attr('action', this.options.urlSave);
					if (this.options.sendWithAjax == true) {
						this.sendForm(true);
						return false;
					}

					return true;
				}
			, this))
			.change($.proxy(
				function(event) {
					var field = $(event.target).data('field');
					if (field == null) {
						return;
					}
					if (field.type == 'subform') {
						return;
					}
					this.changeField();
				}
			, this));

		$(window).resize($.proxy(
			function() {
				this.resizeWindow();
			}
		, this));
	};

	crForm.prototype = {
		initFields: function() {
			for (var fieldName in this.options.fields){

				var field    = this.options.fields[fieldName];
				field.name   = fieldName;
				field.$input = this.$form.find('*[name="' + field['name'] + '"]');

				if (field['type'] != null) {
					field.$input.data( 'field', field);

					switch (field['type']) {
						case 'dropdown':
							field.$input.select2();
							if (field.multiple == true) {
								this.initFieldDropdownMultiple(field);
							}
							break;
						case 'typeahead':
							if (field.multiple == null) {
								field.multiple = false;
							}

							if (field.placeholder != null) {
								field.$input.attr('placeholder', field.placeholder);
							}

							var config = {
								multiple: field.multiple,
//									openOnEnter: false,
								minimumInputLength: 3,
								ajax: {
									url:        field['source'],
									dataType:   'json',
									params:     { skipwWaiting: true },
									data:       function (term, page) {
										return { 'query': term };
									},
									results:    function (data, page) {
										return {results: data};
									}
								}
							};
							if (field.multiple == false) {
								config.placeholder = (field.placeholder != null ? field.placeholder : '-- ' + crLang.line('Choose') + ' --');
								config.allowClear  = true;
							}

							field.$input
								.select2(config)
								.on('select2-open', function(event) {
									$('a > .select2-input').addClass('form-control');
								})
								.on('select2-close', function(event) {
									//$(event.target).parent().find('.form-control').css('border-radius', '4px');
								});

								if (field.multiple == false) {
									if (field.value.id != null && field.value.id != false) {
										field.$input.select2('data', field.value);
									}
								}
								else {
									field.$input.select2('data', field.value);
								}

							break;
						case 'date':
						case 'datetime':
							if ($.inArray(field.$input.val(), ['0000-00-00', '0000-00-00 00:00:00', 'false']) != -1) {
								field.$input.val('');
							}

							var inputName  = field.$input.attr('name');
							var format     = crLang.line('DATE_FORMAT');
							var minView    = 'month';
							if (field['type'] == 'datetime') {
							 	format  = crLang.line('DATE_FORMAT') + ' hh:ii:ss';
								minView = 'hour';
							}

							field.$input
								.data('inputName', inputName)
								.removeAttr('name')
								.on('change',
									function(event){
										var $input = $(event.target);

										if ($input.val() == '') {
											$input.parent().parent().find('input[name=' +  $input.data('inputName') + ']').val('');
											return;
										}

										var datetimepicker = $input.parent().data('datetimepicker');
										var field          = $input.data('field');
										datetimepicker.date.setSeconds(0);
										$input.parent().parent().find('input[name=' +  $input.data('inputName') + ']').val($.ISODateString(datetimepicker.date, field.type == 'date'));
									}
								);

 							field.$input.parent()
								.addClass('date form_datetime')
								.datetimepicker({ 'format': format, 'autoclose': true, 'minView': minView, 'language': $.normalizeLang(crSettings.langId), 'pickerPosition': 'bottom-left' });

							$('<input type="hidden" name="' + inputName + '" />').appendTo(field.$input.parent().parent());
							field.$input.parent().datetimepicker('show').datetimepicker('hide');
							field.$input.change();
							break;
						case 'gallery':
							this.initUploadGallery(field);
							break;
						case 'subform':
							this.loadSubForm(field);
							break;
						case 'raty':
							field.$input
								.removeAttr('name')
								.raty( {
									score:      field['value'],
									scoreName:  field['name'],
									path:       $.base_url('assets/images/'),
									click:      $.proxy(function() {
										this.changeField();
									}, this)
								});
							break;
						case 'upload':
							this.initFieldUpload(field);
							break;
						case 'numeric':
							$maskNumeric = field.$input.clone();
							field.$input.hide();
							$maskNumeric
								.removeAttr('name')
								.insertBefore(field.$input)
								.autoNumeric('init', { aSep: crLang.line('NUMBER_THOUSANDS_SEP'), aDec: crLang.line('NUMBER_DEC_SEP'),  aSign: '', mDec: field.mDec } )
								.change( function(event) {
									$(event.target).next().val($(event.target).autoNumeric('get') ).change();
								});
							break;
						case 'groupCheckBox':
							field.$input.removeAttr('name');
							var $field = field.$input.find('input:first').attr('name', field['name']);
							field.$input.data('$field', $field);

							field.$input.find('input[type=checkbox]')
								.click($.proxy(
									function(event) {
										this.checkGroupCheckBox($(event.target));
										this.updateGroupCheckBox($(event.target).parents('ul'));
										this.changeField();
									}
								, this))
								.each($.proxy(
									function (i, checkbox) {
										this.checkGroupCheckBox($(checkbox));
									}
								, this));

							this.updateGroupCheckBox(field.$input);
							break;
					}
				}
			}
		},

		initCallbacks: function(){
			for (var fieldName in this.options.fields){
				var field = this.options.fields[fieldName];

				if (field.subscribe != null) {
					for (var i = 0; i<field.subscribe.length; i++) {
						var subscribe = field.subscribe[i];
						$(this.getFieldByName(subscribe.field)).bind(
							subscribe.event,
							{ $input: field.$input, callback: subscribe.callback, arguments: subscribe.arguments },
							$.proxy(
								function(event) {
									var arguments = [event.data.$input];
									if (event.data.arguments) {
										for (var i = 0; i<event.data.arguments.length; i++) {
											arguments.push(eval(event.data.arguments[i]));
										}
									}

									var method = event.data.callback;
									if ( this[method] ) {
										return this[ method ].apply( this, Array.prototype.slice.call( arguments, 0 ));
									}
									else {
										$.error( 'Method ' +  method + ' does not exist ' );
									}
								}
							, this)
						);

						if (subscribe.runOnInit == true) {
							$(this.getFieldByName(subscribe.field)).trigger(subscribe.event);
						}
					}
				}
			}
		},

		sendForm: function(saved) {
			if (saved == true) {
				if (this.$btnSubmit.is(':disabled') == true) {
					return;
				}
				this.$btnSubmit.attr('disabled', 'disabled');
				this.$btnSubmit.append(' <i class="iconLoading fa fa-spinner fa-spin " /> ');
			}

			if (this.options.modalHideOnSubmit == true) {
				this.$form.parents('.modal').first().modal('hide');
			}

			$.ajax({
				'type':     'post',
				'url':      this.$form.attr('action'),
				'data':     this.$form.serialize(),
				'complete':
					$.proxy(
						function() {
							this.$btnSubmit.find('.iconLoading').remove();
							this.$btnSubmit.removeAttr('disabled');
						}
					, this),
				'success':
					$.proxy(
						function(response) {
							if (typeof dataLayer != "undefined") {
								dataLayer.push( { 'event': 'crFormSubmit.' + this.options.frmName });
							}

							if (this.options.callback != null) {
								if (typeof this.options.callback == 'string') {
									eval('this.options.callback = ' + this.options.callback);
								}
								this.options.callback(response);
								return;
							}

							response['result']['crForm'] = this;
							if ($.hasAjaxDefaultAction(response) == true) { return; }

							if (this.$form.parents('.modal:first').length == true) {
								this.$form.parents('.modal:first').modal('hide');
								return;
							}
							if ($.url().param('urlList') != null) {
								$.goToUrlList();
								return;
							}
						}
					, this),
			});
		},

		validate: function() {
			this.$form.find('fieldset').removeClass('has-error');

			for (var i = 0; i<this.options.rules.length; i++){
				var field   = this.options.rules[i];
				var rules   = field['rules'].split('|');
				var field   = this.options.fields[field.field];
				var $input  = field.$input;


				for (var z=0; z<rules.length; z++) {
					if (typeof this[rules[z]] === 'function') {
						if (this[rules[z]]($input, field) == false) {
							$input.parents('fieldset').addClass('has-error');
							$input.crAlert($.sprintf(this.options.messages[rules[z]], field['label']));
							return false;
						}
					}
				}
			};

			return true;
		},

		numeric: function($input) {
			return !isNaN($input.val());
		},

		required: function($input, field) {
			switch (field['type']) {
				case 'raty':
					return ( $input.find('input').val().trim() != '');
					break;
				case 'checkbox':
					return $input.is(':checked');
					break;
				default:
					return ( $input.val().trim() != '');
			}
		},

		valid_email: function($input){
			return $.validateEmail($input.val());
		},

		initFieldDropdownMultiple: function(field) {
			var $field = $('<input type="hidden" name="' + field.name + '" />').appendTo(field.$input.parent());

			$field.on('change', function(event) {
				var $field = $(this);
				var value  = null;
				try {
					value = $.parseJSON($field.val());
				}
				catch(err) {
					$field.val('');
				}
				$(this).parent().find('select').select2('val', value);
			});

			field.$input.on('change', function(event) {
				var value  = null;
				var $input = $(this);
				if ($input.val() != null) {
					value  = $.toJSON($input.val());
				}
				$input.data('$field').val(value);
			});

			field.$input
				.removeAttr('name')
				.data('$field', $field)
				.change();
		},

		initFieldUpload: function(field) {
			crMain.loadUploadFile();

			field.$input.data( { 'crForm': this, 'field': field } );
			field.$input.parent().addClass('fieldUpload');

			field.$input.children().remove();

			if (field.disabled != true) {
				field.$input.append('\
					<div class="col-md-6 fileupload-btn" >\
						<span class="btn btn-success fileinput-button">\
							<i class="fa fa-plus"></i>\
							<span>' + crLang.line('Choose file') + '</span> \
							<input type="file" name="userfile" > \
						</span> \
					</div> \
					<div class="col-md-6 fileupload-progress fade"> \
						<div class="progress progress-striped active" role="progressbar" aria-valuemin="0" aria-valuemax="100"> \
							<div class="progress-bar progress-bar-success bar bar-success" style="width:0%;"></div> \
						</div> \
						<div class="progress-extended">&nbsp;</div> \
					</div> ');
			}

			if (field.value == null) {
				field.value = '';
			}

			if (typeof field.value == 'string') {
				if (field.value.trim() != '') {
					field.value = {'url': field.value, 'name': field.value};
				}
			}
			else if (field.value.url == null) {
				field.value = {'url': null, 'name': null};
			}

			if (field.value.url != null) {
				if (field.isPicture == true) {
					field.$input.prepend('<a class="thumbnail"><img  src="' + field.value.url + '" /></a>');
					field.$input.find('img').imgCenter( { centerType: 'inside', animateLoading: true } );
				}
				else {
					field.$input.prepend('<div class="fileName"> <a download="' + field.value.name + '" target="_blank" href="' + field.value.url + '" data-skip-app-link="true"> <i class="fa fa-download"/> <span />  </a> </div>');
					field.$input.find('.fileName span').text(field.value.name);
				}

				if (field.urlDelete != null) {
					field.$input.find('.fileupload-btn').append('<a class="btn btn-danger "> <i class="fa fa-trash-o"></i> ' + crLang.line('Delete') + '</a>');
					field.$input.find('.btn-danger')
						.data( { 'crForm': this, 'field': field })
						.click(
							function (event) {
								var $btnDanger = $(event.target);
								$.ajax({
									'type':   'post',
									'url':     field.urlDelete,
									'data':    { 'deletePicture': true },
									'params': { 'field': $btnDanger.data('field'), 'crForm': $btnDanger.data('crForm') } ,
									'success': function (response) {
										if ($.hasAjaxDefaultAction(response) == true) { return; }

										var crForm    = this.params.crForm;
										var field     = this.params.field;
										field.value   = '';
										setTimeout(function(){ crForm.initFieldUpload(field); }, 1);
									}
								});
							}
					);
				}
			}

			if (field.$input.data('hasFileupload') == true ){
				field.$input.fileupload('destroy');
			}

			field.$input.fileupload( {
				'autoUpload': true,
				'url':        field.urlSave,
				'done':
					function (event, data) {
						var response = data.result;
						if ($.hasAjaxDefaultAction(response) == true) { return; }

						var crForm    = $(event.target).data('crForm');
						var field     = $(event.target).data('field');
						field.value   = response.result;
						setTimeout(function(){ crForm.initFieldUpload(field); }, 1);
					},
				'fail':
					function (event, data) {
						if ($.isUnloadPage == true) {
							return;
						}
						if (data.jqXHR.status === 0) {
							return $(document).crAlert( crLang.line('Not connected. Please verify your network connection') );
						}
						var response = $.parseJSON(data.jqXHR.responseText);
						$.hasAjaxDefaultAction(response);
					}
			} );

			field.$input.data('hasFileupload', true );
		},

		initUploadGallery: function(field) {
			crMain.loadUploadFile();

			this.fileupload   = field;
			var $gallery      = this.$form.find('.gallery');
			this.reloadGallery();

			$('#fileupload').data( { 'crForm': this } );

			$gallery.find('.btnEditPhotos').click( $.proxy(
				function () {
					if (this.$fileupload == null) {
						this.$fileupload = $('#fileupload');

						this.$fileupload
							.unbind('hidden.bs.modal')
							.on('hidden.bs.modal',
							function() {
								var crForm = $(this).data('crForm');
								crForm.reloadGallery();
							}
						);
					}

					this.$fileupload.find('input[name=entityTypeId]').val(this.fileupload.entityTypeId);
					this.$fileupload.find('input[name=entityId]').val(this.fileupload.entityId);
					this.$fileupload.find('input[name=hasEntityLog]').val(this.fileupload.hasEntityLog);
					this.$fileupload.find('form').attr('action', this.fileupload.urlSave);

					$.showModal(this.$fileupload, false, false);
				}
			, this));

			$('#fileupload').fileupload({
				autoUpload: true,
				getFilesFromResponse: function(data) {
					if ($.isArray(data.result.result.files)) {
						return data.result.result.files;
					}

					$.hasAjaxDefaultAction(data.result);
					return [];
				},
				add: function (e, data) {
					var jqXHR = data.submit().complete(function (result, textStatus, jqXHR) {
						$('#fileupload').find('.thumbnail > img').imgCenter( { centerType: 'inside', animateLoading: true });
					});
				}
			});

			$('#fileupload')
				.unbind('fileuploadstop fileuploaddestroyed fileuploaddestroy')
				.bind('fileuploadstop fileuploaddestroyed fileuploaddestroy',
				function (event) {
					if (event.type == 'fileuploaddestroyed') { $.countGalleryProcess--; }
					if (event.type == 'fileuploaddestroy') { $.countGalleryProcess++; }
					$.saveGalleryLog();
				}
			);
		},

		reloadGallery: function() {
			var $gallery = this.$form.find('.gallery');
			$.initGallery($gallery);
			$gallery.find('a').remove();
			$('#fileupload tbody').children().remove();

			$.ajax({
				'url':    this.fileupload.urlGallery,
				'data':   { },
				'success':
					function (response) {
						if ($.hasAjaxDefaultAction(response) == true) { return; }

						var result = response['result'];

						var files = result.files;
						var fu    = $('#fileupload').data('blueimpFileupload');
						fu._renderDownload(files).appendTo($('#fileupload tbody')).addClass('in');

						$('#fileupload').find('.thumbnail img').imgCenter( { centerType: 'inside', animateLoading: true });

						for (var i=0; i<result.files.length; i++) {
							var photo       = result.files[i];
							var $thumbnails = $gallery.find('.thumbnails');

							$('<a class="thumbnail " data-skip-app-link="true" />')
								.append($('<img />').prop('src', photo.urlThumbnail))
								.prop('href', photo.urlLarge)
								.prop('title', $.sprintf(crLang.line('Picture %s'), (i + 1)))
								.appendTo($thumbnails);
						}

						$gallery.find('img').imgCenter( { animateLoading: true } );
					},
			});
		},

		loadSubForm: function(field) {
			$.ajax( {
				'type':  'get',
				'url':   field.controller,
				'success':
					$.proxy(
						function (field, response) {
							if ($.hasAjaxDefaultAction(response) == true) { return; }

							var result  = response['result'];
							var list    = result['list'];
							var showId  = list['showId'] == true;
							field.$input.children().remove();

							var $div   = $('<div class="table-responsive"/>').appendTo(field.$input);
							var $table = $('<table class="table table-hover" />').appendTo($div);
							var $thead = $('<thead/>').appendTo($table);
							var $tr    = $('<tr class="label-primary"/>').appendTo($thead);

							if (showId == true) {
								$('<th class="numeric"> # </th>').appendTo($tr);
							}
							for (var columnName in list['columns']) {
								var $th = $(' <th />')
									.text(list['columns'][columnName])
									.appendTo($tr);

								if ($.isPlainObject(list['columns'][columnName])) {
									$th
										.text(list['columns'][columnName]['value'])
										.addClass(list['columns'][columnName]['class']);
								}
							}

							var $tbody = $(' <tbody />').appendTo($table);
							if (list['data'].length == 0) {
								$( '<tr class="warning"><td colspan="' + (Object.keys(list['columns']).length + 1) + '"> ' + crLang.line('No results') + ' </td></tr>').appendTo($tbody);
							}
							for (var i=0; i<list['data'].length; i++) {
								var row = list['data'][i];

								if ($.isPlainObject(row) == false) {
									$(row).appendTo($tbody);
								}
								else {
									var id  = row[Object.keys(row)[0]];
									var $tr = $( '<tr data-controller="' + $.base_url(list['controller'] + id) + '">').appendTo($tbody);

									if (row['crRowClassName'] != null) {
										$tr.addClass(row['crRowClassName']);
									}

									if (showId == true) {
										$('<td class="numeric" />').appendTo($tr).text(id);
									}
									for (columnName in list['columns']) {
										var $td = $(' <td />')
											.html(row[columnName] || '')
											.appendTo($tr);

										if ($.isPlainObject(list['columns'][columnName])) {
											$td.addClass(list['columns'][columnName]['class']);
										}
									}
								}
							}

							$('<a class="btn btn-default btn-sm btnAdd" href="' + $.base_url(list['controller'] + '0') + '" />')
								.appendTo(field.$input)
								.append(' <i class="fa fa-plus"> </i> ')
								.append(' ' + crLang.line('Add'))
								.data( { 'crForm': this })
								.click(
									function() {
										$(this).data('crForm').showSubForm($(this).attr('href'), field);
										return false;
									}
								);

							$tbody.find('.date, .datetime').each(
								function() {
									$.formatDate($(this));
								}
							);

							$tbody.find('td.dotdotdot').each(
								function() {
									var $td  = $(this);
									var value = $td.html();
									$td.html('');
									var $div = $('<div />').attr('title', value).html(value).appendTo($td);
								}
							);

							$tbody.find('tr').data( { 'crForm': this });
							$tbody.on('click', 'tr',
								function (event) {
									if ($(this).data('controller') == null) {
										return;
									}
									$(this).data('crForm').showSubForm($(this).data('controller'), field);
								}
							);

							field.$input.change();
							this.resizeWindow();
						}
					, this, field)
			});
		},

		showSubForm: function(controller, field) {
			$.ajax( {
				'type': 'get',
				'url':  controller,
				'data': { 'pageJson': true },
				'success':
					$.proxy(
						function (response) {
							if ($.hasAjaxDefaultAction(response) == true) { return; }

							var $subform = $(document).crForm('renderPopupForm', response['result']['form']);
							var $modal   = $subform.parents('.modal');
							$subform.data('frmParent', this);

							$.showModal($modal, false);
							$modal.on('hidden.bs.modal', function() {
								$(this).find('form').data('frmParent').loadSubForm(field);
								$(this).remove();
							});

							if ($.isMobile() == false) {
								$subform.find('select, input[type=text]').first().focus();
							}
						}
					, this)
			});
		},

		getFieldByName: function(fieldName){
			return this.$form.find('*[name="' + fieldName + '"]');
		},

		setErrorField: function(fieldName) {
			var $input = this.getFieldByName(fieldName);
			$input.parents('fieldset').addClass('has-error');
		},

		toogleField: function($field, value) { // TODO: implementar los otros metodos! ( show, hide, etc)
			$field.parent().toggle(value);
		},

		calculatePrice: function($field, $price, $currency, $exchange, $total) {
			if ($total.data('init-price') == null) {
				$maskPrice = $price.clone();
				$price.hide();
				$maskPrice
					.removeAttr('name')
					.insertBefore($price)
					.autoNumeric('init', { aSep: crLang.line('NUMBER_THOUSANDS_SEP'), aDec: crLang.line('NUMBER_DEC_SEP'),  aSign: $currency.find('option:selected').text() +' ' } )
					.change( function(event) {
						$(event.target).next().val($(event.target).autoNumeric('get') ).change();
					});

				$maskExchange = $exchange.clone();
				$exchange.hide();
				$maskExchange
					.removeAttr('name')
					.insertBefore($exchange)
					.autoNumeric('init', { aSep: crLang.line('NUMBER_THOUSANDS_SEP'), aDec: crLang.line('NUMBER_DEC_SEP'),  aSign: '' } )
					.change( function(event) {
						$(event.target).next().val($(event.target).autoNumeric('get') ).change();
					});

				$total.autoNumeric('init', { vMax: 999999999999, aSep: crLang.line('NUMBER_THOUSANDS_SEP'), aDec: crLang.line('NUMBER_DEC_SEP'),  aSign: crSettings.defaultCurrencyName + ' ' } );

				this.$form.bind('submit', $.proxy(
					function($maskPrice, $maskExchange, event) {
						$maskPrice.change();
						$maskExchange.change();
					}
				, this, $maskPrice, $maskExchange));


				$total.data('init-price', true);
			}

			if ($currency.val() == crSettings.defaultCurrencyId) {
				$exchange.val(1);
				$exchange.prev().autoNumeric('set', 1);
			}

			$price.prev().autoNumeric('update', { aSign: $currency.find('option:selected').text() +' ' } );
			$total.autoNumeric('set', $price.val() * $exchange.val());
		},

		sumValues: function($total, aFieldName) {
			if ($total.data('init-price') == null) {
				$total.autoNumeric('init', { vMax: 999999999999, aSep: crLang.line('NUMBER_THOUSANDS_SEP'), aDec: crLang.line('NUMBER_DEC_SEP'),  aSign: crSettings.defaultCurrencyName + ' ' } );
			}

			var total = 0;
			for (var i=0; i<aFieldName.length; i++) {
				var field = $('*[name="' + aFieldName[i] + '"]').data('field');
				if (field.type == 'subform') {
					var value = field.$input.find('input').val();
				}
				else {
					var value = field.$input.val();
				}
				if (isNaN(value) == false) {
					total += Number(value);
				}
			}

			$total.autoNumeric('set', total);
		},

		loadDropdown: function($field, value) {
			var controller = this.options.fields[$field.attr('name')].controller;
			if (value != null) {
				controller += '/' + value;
			}

			$.ajax( {
				'type': 'get',
				'url':  controller,
				'success':
					$.proxy(
						function (result) {
							$field.children().remove();
							for (var i=0; i<result.length; i++) {
								$('<option />').attr('value', result[i]['id']).text(result[i]['value']).appendTo($field);
							}
							$field.val(this.options.fields[$field.attr('name')].value);
							$field.select2();
						}
					, this)
			});
		},

		checkGroupCheckBox: function($checkbox) {
			var $li = $checkbox.parents('li');
			$li.removeClass('active');
			if ($checkbox.is(':checked') == true) {
				$li.addClass('active');
			}
		},

		updateGroupCheckBox: function($input) {
			var value 		= [];
			var aCheckbox 	= $input.find('input[type=checkbox]');
			$input.data('$field').val('');

			for (var i=0; i<aCheckbox.length; i++) {
				var $checkbox = $(aCheckbox[i]);
				if ($checkbox.is(':checked') == true) {
					value.push($checkbox.val());
				}
			}
			if (value.length > 0) {
				$input.data('$field').val($.toJSON(value));
			}
		},

		changeField: function() {
			this.$btnSubmit.removeAttr('disabled');
		},

		resizeWindow: function() {
			if (this.$form.is(':visible') != true) {
				return;
			}
			var width = this.$form.width();
			this.$form.find('.table-responsive').css('max-width', width - 30 );
		}
	};


	renderCrForm = function(data, $parentNode) {
		var buttons = [
			'<button type="button" class="btn btn-default" onclick="$.goToUrlList();"><i class="fa fa-arrow-left"></i> ' + crLang.line('Back') + ' </button> ',
			'<button type="button" class="btn btn-danger"><i class="fa fa-trash-o"></i> ' + crLang.line('Delete') + ' </button>',
			'<button type="submit" class="btn btn-primary" disabled="disabled"><i class="fa fa-save"></i> ' + crLang.line('Save') + ' </button> '
		];
		if (data['urlDelete'] == null) {
			delete buttons[1];
		}

		var pageName = location.href;
		if (pageName.indexOf('?') != -1) {
			pageName = pageName.substr(0, pageName.indexOf('?'));
		}

		data = $.extend({
			'action':  pageName,
			'buttons': buttons
		}, data);

		var $form = $('<form action="' + data['action'] + '" />')
			.addClass(data['frmName'] + ' panel panel-default crForm form-horizontal')
			.attr('role', 'form')
			.appendTo($parentNode);

		var $div = $('<div class="panel-body" />').appendTo($form);
		$div = renderCrFormInfo(data, $div);
		this.renderCrFormFields(data.fields, $div);

		if (data['buttons'].length != 0) {
			$div = $('<div class="formButtons panel-footer" > ').appendTo($form);
			for (var i=0; i<data['buttons'].length; i++) {
				$div.append($(data['buttons'][i])).append(' ');
			}
		}

		return $form;
	},

	renderPopupForm = function(data) {
		var buttons = [
			'<button type="button" class="btn btn-default" data-dismiss="modal" aria-hidden="true">' + crLang.line('Close') + '</button>',
			'<button type="button" class="btn btn-danger"><i class="fa fa-trash-o"></i> ' + crLang.line('Delete') + ' </button>',
			'<button type="submit" class="btn btn-primary" disabled="disabled"><i class="fa fa-save"></i> ' + crLang.line('Save') + ' </button> '
		];
		if (data['urlDelete'] == null) {
			delete buttons[1];
		}

		data = $.extend({ 'buttons': buttons }, data);

		var $modal = $('\
			<div class="modal" role="dialog" >\
				<div class="modal-dialog" >\
					<div class="modal-content" > </div>\
				</div>\
			</div>\
		');

		var $form = $('<form action="' + data['action'] + '" />')
			.addClass(data['frmName'] + ' crForm form-horizontal')
			.attr('role', 'form')
			.appendTo($modal.find('.modal-content'));

		var $modalHeader = $('\
			<div class="modal-header">\
				<button aria-hidden="true" data-dismiss="modal" class="close" type="button">\
					<i class="fa fa-times"></i>\
				</button>\
				<h4 />\
			</div>\
		').appendTo($form);

		$modalHeader.find('h4')
			.append('<i class="' + (data['icon'] != null ? data['icon'] : 'fa fa-edit') + '"></i>')
			.append(' ' + data['title']);

		var $modalBody  = $('<div class="modal-body" />').appendTo($form);
		var $parentNode = $modalBody;

		$parentNode = this.renderCrFormInfo(data, $parentNode);

		this.renderCrFormFields(data.fields, $parentNode);

		if (data['buttons'].length != 0) {
			$modalFooter = $('<div class="formButtons modal-footer" > ').appendTo($form);
			for (var i=0; i<data['buttons'].length; i++) {
				$modalFooter
					.append($(data['buttons'][i]))
					.append(' ');
			}
		}

		$form.crForm(data);

		return $form;
	},

	renderAjaxForm = function(data, $parentNode) {
		var buttons = [
			'<button type="button" class="btn btn-default" onclick="$.goToUrlList();"><i class="fa fa-arrow-left"></i> ' + crLang.line('Back') + ' </button>',
			'<button type="button" class="btn btn-danger"><i class="fa fa-trash-o"></i> ' + crLang.line('Delete') + ' </button>',
			'<button type="submit" class="btn btn-primary" disabled="disabled"><i class="fa fa-save"></i> ' + crLang.line('Save') + ' </button> '
		];
		if (data['urlDelete'] == null) {
			delete buttons[1];
		}

		data = $.extend({ 'buttons': buttons }, data);

		var $form = $('<form action="' + data['action'] + '" />')
			.addClass(data['frmName'] + ' panel panel-default crForm form-horizontal')
			.attr('role', 'form')
			.appendTo($parentNode);

		if (data['title'] != null) {
			$('<div class="panel-heading" />').text(data['title']).appendTo($form);
		}

		var $div = $('<div class="panel-body" />').appendTo($form);
		$div = renderCrFormInfo(data, $div);
		this.renderCrFormFields(data.fields, $div);

		if (data['buttons'].length != 0) {
			$modalFooter = $('<div class="formButtons panel-footer" > ').appendTo($form);
			for (var i=0; i<data['buttons'].length; i++) {
				$modalFooter
					.append($(data['buttons'][i]))
					.append(' ');
			}
		}

		$form.crForm(data);

		return $form;
	},

	renderCrFormFields = function(fields, $parentNode) {
		for (var name in fields) {
			var field     = fields[name];
			var $fieldset = $('\
				<fieldset class="form-group">\
					<label class="col-xs-12 col-sm-3 col-md-3 col-lg-3 control-label">' + field['label'] + '</label>\
					<div class="col-xs-12 col-sm-9 col-md-9 col-lg-9"> </div>\
				</fieldset>');
			$div = $fieldset.find('div');

			switch (field['type']) {
				case 'hidden':
					$fieldset = $('<input type="hidden" name="' + name + '" value="' + field['value'] + '" />');
					break;
				case 'text':
				case 'numeric':
				case 'typeahead':
					var $input = $('<input type="text" />')
						.attr('name', name)
						.addClass('form-control')
						.attr('placeholder',  field['placeholder'])
						.appendTo($div);
					if (field['type'] != 'typeahead') {
						$input.val( field['value']);
					}
					if (field['disabled'] == true) {
						$input.attr('disabled', 'disabled');
					}
					break;
				case 'date':
				case 'datetime':
					var $input = $('<input type="text" />')
						.attr('name', name)
						.val(field['value'])
						.addClass('form-control')
						.attr('size', field['type'] == 'datetime' ? 18 : 9)
						.attr('placeholder', crLang.line('DATE_FORMAT') + (field['type'] == 'datetime' ? ' hh:mm:ss' : '') );

					$datetime = $('<div class="input-group" style="width:1px" />').appendTo($div);
					$datetime.append($input);
					$datetime.append($('<span class="input-group-addon"><i class="glyphicon glyphicon-remove fa fa-times"></i></span>'));
					$datetime.append($('<span class="input-group-addon"><i class="glyphicon glyphicon-th icon-th fa fa-th"></i></span>'));
					break;
				case 'password':
					$div.append('<input type="password" name="' + name + '" class="form-control" />');
					break;
				case 'textarea':
					var $input = $('<textarea cols="40" rows="10" />')
						.attr('name', name)
						.text(field['value'])
						.addClass('form-control')
						.appendTo($div);
					break;
				case 'dropdown':
					var source = field['source'];

					var $input = $('<select />')
						.addClass('form-control')
						.attr('name', name)
						.appendTo($div);

					if (field['appendNullOption'] == true) { // Apendeo aparte porque si lo hago en el objecto chrome lo desordena
						$('<option />')
							.val('')
							.text('-- ' + crLang.line('Choose') + ' --')
							.appendTo($input);
					}

					for (var item in source) {
						var item = field['source'][item];
						$('<option />')
							.val(item['id'])
							.text(item['text'])
							.appendTo($input);
					}

					$input.val(field['value']);
					if (field['disabled'] == true) {
						$input.attr('disabled', 'disabled');
					}
					break;
				case 'groupCheckBox':
					var showId = field['showId'] == true;
					var $input = $('<ul class="groupCheckBox" name="' + name + '" />').appendTo($div);

					$('<li><input type="text" style="display:none" /> </li>').appendTo($input);

					for (var item in field['source']) {
						var item = field['source'][item];
						$input.append('\
							<li>\
								<div class="checkbox">\
									<label>\
										<input type="checkbox" value="' + item['id'] + '" ' + ($.inArray(item['id'], field['value']) != -1 ? ' checked="checked" ' : '' ) + ' />\
										' + item['text'] + (showId == true ? ' - ' + item['id'] : '')  +'\
									</label>\
								</div>\
							</li>');
					}
					break;
				case 'checkbox':
					var className = '';
					if (field['hideOffset'] == true) {
						className = ' hide ';
					}
					$fieldset = $('\
						<fieldset class="form-group">\
							<div class="' + className + ' hidden-xs  col-sm-3 col-md-3 col-lg-3 "> </div>\
							<div class="col-xs-12 col-sm-9 col-md-9  col-lg-9 "> \
								<div class="checkbox" > \
									<label> \
										<input type="checkbox" name="' + name + '" value="on"  ' + (field['checked'] == true ? ' checked="checked" ' : '' ) + ' />  \
										' + field['label'] + '\
									</label> \
								</div> \
							</div> \
						</fieldset>');
					break;
				case 'gallery':
					$div.append($('\
						<div id="' + name + '" data-toggle="modal-gallery" data-target="#modal-gallery" class="gallery well" >\
							<button type="button" class="btn btn-success btn-sm btnEditPhotos fileinput-button">\
								<i class="fa fa-picture-o" ></i>\
								' + crLang.line('Edit pictures') + '\
							</button>\
							<div class="thumbnails" ></div>\
						</div>\
					'));
					break;
				case 'subform':
					$div.append('\
						<div name="' + name + '" class="subform ">\
							<div class="alert alert-warning">\
								<i class="fa fa-spinner fa-spin fa-lg"></i>\
								<small>' + crLang.line('loading ...') + '</small>\
							</div>\
						</div>');
					break;
				case 'tree':
					$fieldset = $('<fieldset class="form-group tree" />');
					this.renderCrFormTree(field['source'], field['value'], $fieldset);
					break;
				case 'link':
					$fieldset = $('\
						<fieldset class="form-group" >\
							<label class="hidden-xs col-sm-3 col-md-3 col-lg-3 control-label" />\
							<div class="col-xs-12 col-sm-9 col-md-9 col-lg-9">\
								<a href="' + field['value'] + '">' + field['label'] + '</a>\
						</fieldset>');
					break;
				case 'raty':
					$div.append('<div class="raty" name="' + name + '" />');
					break;
				case 'upload':
					$div.append('\
						<div name="' + name + '"> </div> ');
					break;
				case 'html':
					$fieldset = $(field['value']);
					break;
			}

			$($fieldset).appendTo($parentNode);
		}
	},

	renderCrFormInfo = function(data, $parentNode) {
		if (data.info == null) {
			return $parentNode;
		}

		var $row    = $('<div class="row">').appendTo($parentNode);
		$parentNode = $('<div class="col-xs-12 col-sm-6 col-md-6 col-lg-6">').appendTo($row);

		var $info = $('<div class="col-xs-12 col-sm-6 col-md-6 col-lg-6">').html(data.info.html).appendTo($row);
		if (data.info.position == 'left' ) {
			$info.before($parentNode);
		}

		return $parentNode;
	},

	renderCrFormTree = function(aTree, value, $parent){
		var $ul = $('<ul />').appendTo($parent);
		for (var i=0; i<aTree.length; i++) {
			var $li   = $('<li/>').appendTo($ul);
			var $link = $('<a />')
				.attr('href', $.base_url(aTree[i]['url']))
				.text(aTree[i]['label'])
				.appendTo($li);

			if (value == aTree[i]['id']) {
				$link.addClass('selected');
			}

			if (aTree[i]['childs'].length > 0) {
				this.renderCrFormTree(aTree[i]['childs'], value, $li);
			}
		}

		return $ul;
	};
})($);
