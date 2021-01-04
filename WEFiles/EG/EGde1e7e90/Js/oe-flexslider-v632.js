/*
 * openElement-specific - initialize, fix and control each Glexslider element on the page 
 * ToDo: thumbs on the top, preload
 */

$(window).load(function(){ EGde1e7e90.windowLoaded = true; });

$(function(){ EGde1e7e90.Init(); });

var EGde1e7e90 = {

	Init: function() {
		if (typeof(OEConfEGde1e7e90) === undefined) return;
		var allElements = OEConfEGde1e7e90;

		for(var ID in allElements) {
			var $el = $('#'+ID); // The element's main <div> tag
			var properties = allElements[ID]; // element's available properties for JS
			this.InitElement(ID, $el, properties);
		}
	},

	
	InitElement: function(ID, $el, properties) {
		var self = this,
			inEditor = (WEInfoPage.RenderMode == 'Editor');
		
		this.showLoading($el, true); // "loading..." state
		
		var $flexslider = $el.find('.flexslider.oefs-slides'),
			$thumbs = $el.find('.flexslider.oefs-thumbs');
		
		var options = {};
		this.setOptions($el, properties, options);
		
		// Custom arrows:
		var $prev = null, $next = null;
		var removeArrowIcons = properties.Remove_Default_Arrow_Icons;
		if (!inEditor) {
			if(properties.Custom_Arrow_Prev!==null){if (properties.Custom_Arrow_Prev.List.length !==0){$prev = $('#'+properties.Custom_Arrow_Prev.List[0]);}}
			if(properties.Custom_Arrow_Next!==null){if (properties.Custom_Arrow_Next.List.length !==0){$next = $('#'+properties.Custom_Arrow_Next.List[0]);}}
			if ($prev && $prev.length && $next && $next.length) {
				removeArrowIcons = true;
				if (properties.Mode_Custom_Arrows) { // elements will be moved later
				} else {
					options.customDirectionNav = $prev.addClass('flex-prev').add($next.addClass('flex-next'));
					$prev = $next = null;
				}
			} else {
				$prev = $next = null;
			}
		}
		if (removeArrowIcons) {
			$el.addClass('oefs-remove-arrows');
		}
		
		if (inEditor) { // editor mode - block animation
			options.slideshow = false;
			options.animation = "slide";
			smoothHeight = false;
		}

		var optionsThumbs = null;
		if (properties.Use_Thumbs) {
			optionsThumbs = this.initThumbs($el, ID, $thumbs, properties, options);
		} else {
			$thumbs.remove();
			$thumbs = null;
		}
		
		if (!options.controlNav) {
			$flexslider.addClass('oefs-without-navpoints'); // remove default bottom margin
		}
		
		if (properties.handleResize) {
			$(window).resize(function(){
				self.onResize($el, properties);
			});
		}
		

		// Apply FlexSlider:
		function _apply() {
			
			if (!self.applyFlexsliders($el, $flexslider, $thumbs, properties, options, optionsThumbs)) { 
				return; 
			}
		
			if (!inEditor && properties.Mode_Custom_Arrows && $prev && $next) { // move custom arrow elements to replace normal arrows
				self.insertCustomArrows($el, $flexslider, $thumbs, $prev, $next, properties);
			}
			
			if (!inEditor) { // apply links to slides or carousel (not to gallery's thumbs)
				self.ApplyLinks($flexslider, properties);
			
			} else { // Editor mode
				$el.find('a.oefs-link').remove(); // remove links to not be able to click them!

				// Check constantly and redo the slider if OE redrew the element
				clearInterval($el.data('intid'));
				$el.data('intid', setInterval(function(){
					var $elNew = $('#'+ID);
					if ($elNew.find('.oefs-slides.oefs-hidden').length) { // means element was reset - apply Flexslider again
						clearInterval($el.data('intid'));
						self.InitElement(ID, $elNew, properties);
					}
				}, 500));
			}
			
		}
		
		/*
		if ((!inEditor && properties.Load_Mode == 0) || this.windowLoaded) {
			_apply();
		} else { // wait for page resources to be fully loaded
			$(window).load(function(){ _apply(); });
		}
		*/
		this.waitLoadImages($el, properties, _apply); // set img src and proceed according to Load_Mode setting
		
	}, // End InitElement ///////////////////////////////////////////////////////////////////
	
	
	showLoading: function($el, show) {
		if (!show) {
			$el.find('.oefs-loading').remove();
		} else {
			$el.find('.OESZ_DivContent:first').append(
				"<div class='oefs-loading'><div class='sub'></div></div>");
		}
	},
	
	
	setOptions: function($el, properties, options) { // Set slider options (not all) from properties
		var self = this;
		
		properties.Use_Thumbs 		= (properties.Mode === 0); // gallery mode (with thumbs)
		properties.Mode_Carousel	= (properties.Mode === 2); // carousel mode
		
		var animations = ['slide', 'fade'];
		options.animation 		= animations[properties.Animation] || 'slide';
		
		options.allowOneSlide	= true;
		options.smoothHeight	= true;
		options.prevText		= '';
		options.nextText		= '';
			
		$el.data('sliderObjects', []);
		options.start = function(slider) {
			$el.data('sliderObjects').push(slider); // memorize slider and (eventually) thumbs carousel
		}
			
		options.before = function(slider) { // called when slide changed and animation starts
			self.onSlideChange($el, properties, slider); // atm does nothing
		}
		
		// Animation settings:
		
		if (properties.Animation_Speed)
			options.animationSpeed = properties.Animation_Speed;
		if (properties.Slideshow_Speed)
			options.slideshowSpeed = properties.Slideshow_Speed + properties.Animation_Speed;
		if (properties.Init_Delay)
			options.initDelay = properties.Init_Delay;
		options.slideshow	 	= properties.Autoplay;
		options.animationLoop 	= properties.Animation_Loop;
		options.startAt 		= properties.Start_From && (properties.Mode === 1); // Slider mode only;
		options.randomize 		= properties.Randomize  && (properties.Mode === 1); // Slider mode only
		options.move 			= properties.Num_Slides_Move;
		
		// Texts:
		$el.addClass('oefs-text-position-' + properties.Texts_Position);
		
		// Navigation controls:
		options.directionNav 	= (properties.Arrow_Display_Mode != 1 && properties.Arrow_Display_Mode != 3); // not None or Thumbs only
		options.controlNav 		= properties.Display_Nav_Points;
		
		if (properties.Mode_Carousel) { // carrousel mode
			properties.Use_Thumbs 		= false; // no thumbs!
			options.animation 			= "slide";
			options.itemWidth 			= 100; // exact value will be ignored
			options.itemMargin 			= properties.Item_Margin;
			options.minItems 			= options.maxItems = this.numThumbs(properties);
			properties.handleNumItems 	= properties.handleResize = true;
		}
		
	},
	
	
	initThumbs: function($el, ID, $thumbs, properties, options) {
		$thumbs.find('img').each(function(){
			$(this).attr('src', $(this).attr('src').trim()); // fix line break caused by sequence of internal tags
		});

		// Slider (not carousel) mode with thumbs - create second slider-carousel for thumbs
		options.controlNav = false;
		$thumbs.addClass('oefs-without-navpoints');

		optionsThumbs = $.extend({}, options);
		optionsThumbs.animation = "slide";
		optionsThumbs.startAt = 0;
		/*if (optionsThumbs.startAt > 0) {
				optionsThumbs.move = 1;
			}*/			
		//options.slideshow = false;
		options.randomize = false;
		optionsThumbs.directionNav =  (properties.Arrow_Display_Mode != 1 && properties.Arrow_Display_Mode != 2); // not None or Slide only
		optionsThumbs.itemWidth = 100; // exact value will be ignored
		optionsThumbs.itemMargin = properties.Item_Margin;
		optionsThumbs.minItems = optionsThumbs.maxItems = this.numThumbs(properties);
		properties.handleNumItems = properties.handleResize = true;

		optionsThumbs.customDirectionNav = null; // remove custom naviation from thumbs if set

		optionsThumbs.slideshow = false; // if enabled, auto animation should only remain on slider
		options.sync 			= "#" + ID + " .oefs-thumbs";
		optionsThumbs.asNavFor 	= "#" + ID + " .oefs-slides";
		
		return optionsThumbs;
	},
	
	
	applyFlexsliders: function($el, $flexslider, $thumbs, properties, options, optionsThumbs) {
		if (!$flexslider || !$flexslider.length || !$flexslider.hasClass('oefs-hidden')) { 
			return false; 
		}

		$flexslider.removeClass('oefs-hidden');
		if ($thumbs) { // thumbs carousel should be created first!
			$thumbs.removeClass('oefs-hidden').flexslider(optionsThumbs);
		}
		$flexslider.flexslider(options);
		if (WEInfoPage.RenderMode != 'Editor' && options.controlNav) {
			// move buttons out of the flexslider tag to avoid blonking because of overflow:hidden
			$flexslider.parent().children('.flex-control-nav').remove();
			$flexslider.parent().append($flexslider.find('.flex-control-nav'));
		}
		
		this.showLoading($el, false);
		return true;
	},
	
	
	insertCustomArrows: function($el, $flexslider, $thumbs, $prev, $next, properties) {
		var $targetSlider = (properties.Mode_Custom_Arrows == 2 && $thumbs) ? $thumbs : $flexslider;
		var $origPrev = $targetSlider.find('.flex-nav-prev a'),
			$origNext = $targetSlider.find('.flex-nav-next a');
		if ($origPrev.length && $origNext.length) {
			$origPrev.addClass('oefs-moved-arrow').html('').append($prev);
			$origNext.addClass('oefs-moved-arrow').html('').append($next);
		}
	},
	
		
	onResize: function($el, properties) {
		if ($el.find('.oefs-slides.oefs-hidden').length) { // slider not yet initialised
			return;
		}

		if (properties.handleNumItems) {
			var numItems = this.numThumbs(properties);
			var sliders = $el.data('sliderObjects') || [];
			for (var i in sliders) {
				var slider = sliders[i];
				if (slider.vars) {
					slider.vars.minItems = slider.vars.maxItems = numItems;
				}
			}
		}
	},
	
	
	onSlideChange: function(slider, $el, properties) {
		// On slide changed: add processing if needed
	},
	
	
	numThumbs: function(properties) { // dynamic control of number of thumbs in thumbnail container or in carousel mode
		var num = properties.Num_Thumbs;
		if (window.innerWidth <= properties.Resp_Smartphone_Width) {
			num = properties.Num_Thumbs_Smartphone;
		} else if (window.innerWidth <= properties.Resp_Tablet_Width) {
			num = properties.Num_Thumbs_Tablet;
		}
		return num || 4;
	},
	
	
	ApplyLinks: function($parent, properties) {
		var $lis = $parent.find('.slides > li');
		// add open in new tab or popup to links where needed
		for (var i in properties.Slides) {
			var pSlide = properties.Slides[i];
			var pLink = pSlide.Link,
				pTarget = pLink ? pLink.Target : null;
			if (pTarget) {
				var $li = $lis.eq(i),
					$a = $li.find('a');
				if ($a.length) { //  && $li.attr('data-oe-link')
					var inNewTab = (pLink.Target.Target == '_blank');
					if (pTarget.Target == '_blank') {
						$a.attr('target', pLink.Target.Target);
					} else if (pLink.Target.Target == '_popup') {
						var popupParams = '';
						for (var pKey in pTarget) {
							if (pKey.indexOf('Popup') === 0) {// ex. PopupToolbar: true
								if (pTarget[pKey] !== true && pTarget[pKey] !== false) { continue; } 
								popupParams += (popupParams ? ',' : '')
									+ pKey.substr(5).toLowerCase() + '=' + (pTarget[pKey] ? 'yes' : 'no'); // ex. "toolbar=yes"
							}	
						}
						$a.attr('onclick', "return OE.Navigate.popup(event,this.href,''," 
							+ pTarget.PopupWidth + ','+ pTarget.PopupHeight + ','+ pTarget.PopupTop + ','+ pTarget.PopupLeft 
								+ ",'"+ popupParams +  "')");
						// ex. OE.Navigate.popup(event,this.href,'',0,0,-1,-1,'toolbar=no,location=no,directories=no,menubar=yes,status=yes,scrollbars=no,resizable=no')
					}
				}
			}
		}
	},
	
	
	waitLoadImages: function($el, properties, callbackContinue) {
		// load images then continue initialization according to loading preference
		var loadDelayed = properties.Postload;
		
		var $imgs = [];
		$el.find('img').each(function(){ // all images with delayed loading
			var $img = $(this), src = $img.attr('data-src');
			src = src ? src.trim() : src;
			if (src) {
				if (WEInfoPage.RenderMode == 'Editor') { // no wait
					$img.attr('src', src); // load now
				} else {
					$imgs.push($img.data('src', src));
				}
			}
		});
		
		var numNonLoaded = $imgs.length;
		var loaded = {};
		if (!numNonLoaded) { // proceed immediately
			callbackContinue();
			return;
		}
		
		var onLoaded = function(i) {
			if (!loaded[i]) { // avoid double-considering the same image
				loaded[i] = true;
				numNonLoaded--;
				if (numNonLoaded < 1) { // all images are loaded
					callbackContinue();
				}
			}
		}
		
		var loadImages = function(){
			// load images before proceeding:
			for (var i in $imgs) {
				var $img = $imgs[i], img = $img[0], src = $img.data('src');
				img.ii = i;
				img.onload = function() {
					onLoaded(this.ii);
				};
				$img.attr('src', src);
				if (img.complete) { // already loaded (cache or present elsewhere on the page, if onload malfunctioned)
					onLoaded(i);
				}
			}			
		};
		
		if (!loadDelayed || EGde1e7e90.windowLoaded) { // load images now, without waiting for rest of page to load, and proceed when all images are loaded
			loadImages();
		} else {
			$(window).load(function(){ loadImages()}); // load images after all other page resources, and proceed when all images are loaded
		}
	},

	
};

