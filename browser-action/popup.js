/**
 * VideoSegments. Browser extension to skip automatically unwanted content in videos
 * Copyright (C) 2017-2018  VideoSegments Team
 * 
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 3 of the License, or
 * (at your option) any later version.
 * 
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 * 
 * You should have received a copy of the GNU General Public License
 * along with this program; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin Street, Fifth Floor, Boston, MA 02110-1301  USA
 */

'use strict';

// crossbrowser support
if ( typeof this.chrome != 'undefined' ) {
	this.browser = this.chrome;
}

document.addEventListener('DOMContentLoaded', domContentLoaded);

// browser.runtime.onMessage.addListener(function(message) {
	// if ( typeof message.gotCategory !== 'undefined' ) {
		// let scope = document.getElementById('scope');
		// scope.readOnly = false;
		// scope.value = message.gotCategory;
		// scope.readOnly = true;
	// }
	// else if ( typeof message.gotChannel !== 'undefined' ) {
		// let scope = document.getElementById('scope');
		// scope.readOnly = false;
		// scope.value = message.gotChannel;
		// scope.readOnly = true;
	// }
// });

function domContentLoaded()
{
	let tabs = document.getElementById('tabs');
	// hook clicks on tab
	let buttons = tabs.getElementsByTagName('button');
	for ( let i = 0; i < buttons.length; ++i ) {
		buttons[i].addEventListener('click', switchTab);
	}
	
	// check if user is logged in 
	checkLogin();
	
	// load settings 
	loadSettings();
	
	let button;
	button = document.getElementById('next-segmentation');
	button.addEventListener('click', openNextSegmentationRequest);
	
	// let select = document.getElementById('scope-playback');
	// select.addEventListener('change', function() {
		// if ( select.value == 'category' ) {
			// browser.tabs.query({ currentWindow: true, active: true }, function(tabs) {
				// for ( let tab of tabs ) {
					// browser.tabs.sendMessage(tab.id, { getCategory: true });
				// }
			// });
		// }
		// else if ( select.value == 'channel' ) {
			// browser.tabs.query({ currentWindow: true, active: true }, function(tabs) {
				// for ( let tab of tabs ) {
					// browser.tabs.sendMessage(tab.id, { getChannel: true });
				// }
			// });
		// }
	// });
	
	let iframe = document.getElementById('settings-iframe');
	window.addEventListener('message', function(event) {
		// iframe.style.height = event.data+'px';
		checkLogin();
	});
}

function switchTab()
{
	// remove old active tab class 
	let tab = document.getElementsByClassName('active-tab')[0];
	tab.classList.remove('active-tab');
	
	// change active tab class 
	this.classList.add('active-tab');
	
	// open tab content  
	openTab(this.id.slice(4));
}

function openTab(tabName)
{
	// close all tabs 
	let tabs = document.getElementsByClassName('tab-content');
	for ( let i = 0; i < tabs.length; ++i ) {
		tabs[i].style.display = 'none';
	}
	
	// show desired
	let tab = document.getElementById(tabName);
	tab.style.display = 'block';
}

function checkLogin()
{
	let xhr = new XMLHttpRequest();
	xhr.open('GET', 'https://db.videosegments.org/api/v3/status.php');
	xhr.onreadystatechange = function() { 
		// console.log(xhr);
		if ( xhr.readyState == 4 ) {
			if ( xhr.status == 200 ) {
				console.log(xhr.responseText);
				let response = JSON.parse(xhr.responseText);
				if ( response.authorized && response.moderator ) {
					let element = document.getElementById('settings-database-admin');
					browser.runtime.sendMessage( {'displayPending': true });
					element.style.display = 'block';
					updateRequestsCount();
				}
				else {
					let element = document.getElementById('settings-database-admin');
					browser.runtime.sendMessage( {'displayPending': false });
					element.style.display = 'none';
				}
			}
		}
	}
	
	xhr.setRequestHeader("content-type", "application/x-www-form-urlencoded");
	xhr.send();
}

function updateRequestsCount()
{
	let xhr = new XMLHttpRequest();
	xhr.open('POST', 'https://db.videosegments.org/api/v3/review.php?requests');
	xhr.onreadystatechange = function() { 
		if ( xhr.readyState == 4 ) {
			if ( xhr.status == 200 ) {
				// console.log('xhr.responseText', xhr.responseText);
				
				var response = JSON.parse(xhr.responseText);
				if ( response.requests != 'undefined' ) {
					var span;
					
					span = document.getElementById('segmentations-count');
					span.removeChild(span.firstChild);
					span.appendChild(document.createTextNode(response.requests));
				}
			}
		}
	}
	
	let post = '';
	xhr.setRequestHeader("content-type", "application/x-www-form-urlencoded");
	xhr.send(post);
}

function openNextSegmentationRequest()
{
	let xhr = new XMLHttpRequest();
	xhr.open('POST', 'https://db.videosegments.org/api/v3/review.php?pending');
	xhr.onreadystatechange = function() { 
		if ( xhr.readyState == 4 ) {
			if ( xhr.status == 200 ) {
				// console.log('xhr.responseText', xhr.responseText);
				
				let response = JSON.parse(xhr.responseText);
				if ( response.id ) {
					let pending = {
						timestamps: response.timestamps,
						types: response.types
					};
					
					browser.storage.local.set({ pending: pending }, function() {
						browser.tabs.query({currentWindow: true, active: true}, function (tab) {
							browser.tabs.update(tab.id, {url: 'https://www.youtube.com/watch?v=' + encodeURIComponent(response.id)} );
						});
					});
				}
			}
		}
	}
	
	let post = 'get_pending=1';
	xhr.setRequestHeader("content-type", "application/x-www-form-urlencoded");
	xhr.send(post);
}

function openNextRequest()
{
	let xhr = new XMLHttpRequest();
	xhr.open('POST', 'https://db.videosegments.org/requests.php');
	xhr.onreadystatechange = function() { 
		if ( xhr.readyState == 4 ) {
			if ( xhr.status == 200 ) {
				let response = JSON.parse(xhr.responseText);
				if ( response.id ) {
					browser.storage.local.set({ request: '1' }, function() {
						browser.tabs.query({currentWindow: true, active: true}, function (tab) {
							browser.tabs.update(tab.id, {url: 'https://www.youtube.com/watch?v=' + encodeURIComponent(response.id)} );
						});
					});
				}
			}
		}
	}
	
	let post = 'get_request=1';
	xhr.setRequestHeader("content-type", "application/x-www-form-urlencoded");
	xhr.send(post);
}

function loadSettings()
{
	// default extension settings 
	let defaultSettings = {
		// segments configuration
		segments: {
			// content 
			c: 	{ skip: false, color: '#00c853', duration: 0.0, speed: 1.0 },
			// adcontent 
			ac: { skip: false, color: '#00897b', duration: 0.0, speed: 1.0 },
			// advertisement 
			a: 	{ skip: true,  color: '#e53935', duration: 0.0, speed: 5.0 },
			// intro 
			i: 	{ skip: true,  color: '#3949ab', duration: 0.0, speed: 5.0 },
			// credits 
			cr: { skip: true,  color: '#ffb300', duration: 0.0, speed: 5.0 },
			// cutscene 
			cs: { skip: true,  color: '#757575', duration: 0.0, speed: 2.0 },
			// offtop 
			o: 	{ skip: true,  color: '#8e24aa', duration: 0.0, speed: 3.0 },
			// interactive 
			ia: { skip: true,  color: '#00acc1', duration: 0.0, speed: 4.0 },
			// scam 
			s:	{ skip: true,  color: '#6d4c41', duration: 0.0, speed: 5.0 },
		},
		
		// global settings 
		autoPauseDuration: 1.0,
		showSegmentationTools: false,
		hideOnSegmentedVideos: false,
		pinSegmentationTools: false,
		hideIcon: false,
		popupDurationOnSend: 3.0,
		databasePriority: 'local',
		segmentationToolsOpacity: 100,
		iconOpacity: 100,
		segmentsBarLocation: 'separated',
		
		// segmentation settings 
		// sendToDatabase: false,
		displayPending: false,
		openSettings: false,
		
		// backward compatibility 
		// this var was intented to be flag but got replaced by string 
		simplified: true,
		// addon working in simplified (skip-play) mode 
		mode: 'simplified', 	
		
		// first time launch stuff
		highlightIcon: true, // red border over icon 
		// tutorial 
		tutorial: 0,
	}
	
	browser.storage.local.get({
			settings: defaultSettings,
			totalTime: 0,
		}, function(result) {
			// console.log(result);
			
			// backward compatibility 
			if ( result.settings.simplified === false ) {
				result.settings.simplified = true;
				result.settings.mode = 'normal';
			}
			
			restoreOptions(result.settings);
			
			let seconds = Number(result.totalTime);
			let element = document.getElementById('saved-time');
			
			let h = Math.floor(seconds / 3600);
			let m = Math.floor(seconds % 3600 / 60);
			let s = Math.floor(seconds % 3600 % 60);

			let totalTimeSaved = (h<10?('0'+h):h) + ":" + ('0' + m).slice(-2) + ":" + ('0' + s).slice(-2);
			element.textContent = totalTimeSaved;
			
			// result.settings.tutorial = 0;
			// result.settings.mode === 'simplified' to backward compatibility
			if ( result.settings.tutorial > 0 || result.settings.mode === 'normal' ) {
				if ( result.settings.mode === 'simplified' ) {
					document.getElementsByClassName('simplified-mode')[0].style.display = 'block';
					document.getElementsByClassName('normal-mode')[0].style.display = 'none';
					document.getElementsByClassName('tutorial')[0].style.display = 'none';
				}
				else {
					document.getElementsByClassName('simplified-mode')[0].style.display = 'none';
					document.getElementsByClassName('normal-mode')[0].style.display = 'block';
					document.getElementsByClassName('tutorial')[0].style.display = 'none';
				}
			}
			else {
				document.getElementsByClassName('simplified-mode')[0].style.display = 'none';
				document.getElementsByClassName('normal-mode')[0].style.display = 'none';
				document.getElementsByClassName('tutorial')[0].style.display = 'block';
				document.getElementById('tutorial-image').src = browser.extension.getURL('browser-action/tutorial.png');
				
				document.getElementById('tutorial-finish').addEventListener('click', function() {
					if ( result.settings.mode === 'simplified' ) {
						document.getElementsByClassName('simplified-mode')[0].style.display = 'block';
						document.getElementsByClassName('normal-mode')[0].style.display = 'none';
					}
					else {
						document.getElementsByClassName('simplified-mode')[0].style.display = 'none';
						document.getElementsByClassName('normal-mode')[0].style.display = 'block';
					}
					
					result.settings.tutorial = 1;
					browser.storage.local.set({ settings: result.settings });
					document.getElementsByClassName('tutorial')[0].style.display = 'none';
				});
			}
		}
	);
}
	
function restoreOptions(settings) 
{
	let tr;
	
	// playback settings 
	let playback = document.getElementById('playback-settings');
	tr = playback.getElementsByTagName('tr');
	for ( let i = 0; i < tr.length; ++i ) {
		let segment = tr[i].id.slice(8);
		
		let select = tr[i].getElementsByTagName('select')[0];
		select.value = settings.segments[segment].skip ? '1' : '0';
		select.addEventListener('change', function() { updatePlayback(this, settings, segment); });
		
		let input = tr[i].getElementsByTagName('input')[0];
		input.jscolor.fromString(settings.segments[segment].color);
		input.addEventListener('change', function() { updateColor(this, settings, segment); });
	}
	
	// acceleration settings 
	let acceleration = document.getElementById('acceleration-settings');
	tr = acceleration.getElementsByTagName('tr');
	for ( let i = 1; i < tr.length; ++i ) {
		let segment = tr[i].id.slice(8);
		
		let inputs = tr[i].getElementsByTagName('input');
		inputs[0].value = settings.segments[segment].duration;
		inputs[1].value = settings.segments[segment].speed*100;
		
		inputs[0].addEventListener('change', function() { updateAccelerationDuration(this, settings, segment); });
		inputs[1].addEventListener('change', function() { updateAccelerationSpeed(this, settings, segment); });
	}
	
	if ( settings.openSettings ) {
		document.getElementById('playback').style.display = 'none';
		document.getElementById('account').style.display = 'block';
		
		document.getElementById('tab-playback').classList.remove('active-tab');
		document.getElementById('tab-account').classList.add('active-tab');
	}
	
	let modes = ['simplified-', ''];
	let twins = ['', 'simplified-'];
	for ( let i = 0; i < modes.length; ++i ) {
		// global settings 
		let element;
		
		element = document.getElementById(modes[i]+'autoPauseDuration');
		element.value = settings.autoPauseDuration;
		element.twin = twins[i];
		element.addEventListener('change', function() { updateGlobalValue(this, settings, 'autoPauseDuration'); });
		
		element = document.getElementById(modes[i]+'popupDurationOnSend');
		element.value = settings.popupDurationOnSend;
		element.twin = twins[i];
		element.addEventListener('change', function() { updateGlobalValue(this, settings, 'popupDurationOnSend'); });
		
		element = document.getElementById(modes[i]+'segmentationToolsOpacity');
		element.value = settings.segmentationToolsOpacity;
		element.twin = twins[i];
		element.addEventListener('change', function() { updateGlobalValue(this, settings, 'segmentationToolsOpacity'); });
		
		element = document.getElementById(modes[i]+'iconOpacity');
		element.value = settings.iconOpacity;
		element.twin = twins[i];
		element.addEventListener('change', function() { updateGlobalValue(this, settings, 'iconOpacity'); });
		
		element = document.getElementById(modes[i]+'showSegmentationTools');
		element.checked = settings.showSegmentationTools;
		element.twin = twins[i];
		element.addEventListener('change', function() { updateGlobalBool(this, settings, 'showSegmentationTools'); });
		
		element = document.getElementById(modes[i]+'hideOnSegmentedVideos');
		element.checked = settings.hideOnSegmentedVideos;
		element.twin = twins[i];
		element.addEventListener('change', function() { updateGlobalBool(this, settings, 'hideOnSegmentedVideos'); });
		
		element = document.getElementById(modes[i]+'pinSegmentationTools');
		element.checked = settings.pinSegmentationTools;
		element.twin = twins[i];
		element.addEventListener('change', function() { updateGlobalBool(this, settings, 'pinSegmentationTools'); });
		
		element = document.getElementById(modes[i]+'hideIcon');
		element.checked = settings.hideIcon;
		element.twin = twins[i];
		element.addEventListener('change', function() { updateGlobalBool(this, settings, 'hideIcon'); });
		
		element = document.getElementById(modes[i]+'databasePriority');
		element.value = settings.databasePriority;
		element.twin = twins[i];
		element.addEventListener('change', function() { updateGlobalSelect(this, settings, 'databasePriority'); });
		
		element = document.getElementById(modes[i]+'segmentsBarLocation');
		element.value = settings.segmentsBarLocation;
		element.twin = twins[i];
		element.addEventListener('change', function() { updateGlobalSelect(this, settings, 'segmentsBarLocation'); });
		
		element = document.getElementById(modes[i]+'mode');
		element.value = settings.mode;
		element.twin = twins[i];
		element.addEventListener('change', function() {
			updateGlobalValue(this, settings, 'mode');
			switchMode();
		});
	}
	
	let element;
	
	element = document.getElementById('displayPending');
	element.checked = settings.displayPending;
	element.addEventListener('change', function() { updateGlobalBool(this, settings, 'displayPending'); browser.runtime.sendMessage( {'displayPending': this.checked }); });
	
	element = document.getElementById('openSettings');
	element.checked = settings.openSettings;
	element.addEventListener('change', function() { updateGlobalBool(this, settings, 'openSettings'); });
}

function switchMode()
{
	let simplified = document.getElementsByClassName('simplified-mode')[0];
	let normal = document.getElementsByClassName('normal-mode')[0];
	
	if ( simplified.style.display == 'block' ) {
		simplified.style.display = 'none';
		normal.style.display = 'block';
		
		let tab = document.getElementsByClassName('active-tab')[0];
		tab.classList.remove('active-tab');
		
		document.getElementById('tab-settings').classList.add('active-tab');
		openTab('settings');
	}
	else {
		simplified.style.display = 'block';
		normal.style.display = 'none';
	}
}

function updatePlayback(element, settings, segment)
{
	settings.segments[segment].skip = element.value == '1' ? true : false;
	browser.storage.local.set({ settings: settings });
	notifyMediaPlayerWrapper(settings);
}

function updateColor(element, settings, segment)
{
	settings.segments[segment].color = element.jscolor.toHEXString();
	browser.storage.local.set({ settings: settings });
	notifyMediaPlayerWrapper(settings);
}

function updateAccelerationDuration(element, settings, segment)
{
	settings.segments[segment].duration = element.value;
	browser.storage.local.set({ settings: settings });
	notifyMediaPlayerWrapper(settings);
}

function updateAccelerationSpeed(element, settings, segment)
{
	settings.segments[segment].speed = element.value / 100.0; 
	browser.storage.local.set({ settings: settings });
	notifyMediaPlayerWrapper(settings);
}

function updateGlobalValue(element, settings, field)
{
	settings[field] = element.value;
	if ( typeof element.twin !== 'undefined' ) {
		document.getElementById(element.twin+field).value = element.value;
	}
	browser.storage.local.set({ settings: settings });
	notifyMediaPlayerWrapper(settings);
}

function updateGlobalBool(element, settings, field)
{
	settings[field] = element.checked;
	if ( typeof element.twin !== 'undefined' ) {
		document.getElementById(element.twin+field).checked = element.checked;
	}
	browser.storage.local.set({ settings: settings });
	notifyMediaPlayerWrapper(settings);
}

function updateGlobalSelect(element, settings, field)
{
	settings[field] = element.value;
	if ( typeof element.twin !== 'undefined' ) {
		document.getElementById(element.twin+field).value = element.value;
	}
	browser.storage.local.set({ settings: settings });
	notifyMediaPlayerWrapper(settings);
}

function notifyMediaPlayerWrapper(settings)
{
	browser.tabs.query({}, function(tabs) {
		for ( let i = 0; i < tabs.length; ++i ) {
			browser.tabs.sendMessage(tabs[i].id, { settings: settings });
		}
	});
}