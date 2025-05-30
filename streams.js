(function() {
    'use strict';
    
    const currentUrl = window.location.href;
    const finalUrl = currentUrl.includes('/watch/') ? currentUrl.replace("/watch/", "/") : currentUrl;
    const app = {};
    
    const DOMElements = {
        fileName: document.getElementById('file-name'),
        streamDropdownContainer: document.getElementById('stream-dropdown-container'),
        streamMenu: document.getElementById('stream-menu'),
        toast: document.getElementById('toast'),
        toastMessage: document.getElementById('toast')?.querySelector('.toast-message'),
        toastIcon: document.getElementById('toast')?.querySelector('.toast-icon'),
        themeToggleBtn: document.querySelector('.toggle-dark-mode')
    };
    
    let toastTimeout = null;
    
    const sanitizeFilename = name => name.replace(/[<>:"/\\|?*]/g, '_').replace(/\s+/g, '_').replace(/_{2,}/g, '_');
    
    const getFileExtension = url => {
        try {
            const p = new URL(url).pathname;
            const d = p.lastIndexOf('.');
            if (d > 0 && d < p.length - 1) return p.substring(d + 1).toLowerCase();
        } catch (e) {
            console.error('getFileExtension error:', e);
        }
        return 'file';
    };
    
    const getCurrentFileName = () => DOMElements.fileName?.textContent?.trim() || '';
    
    const setTheme = theme => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
        const icon = DOMElements.themeToggleBtn?.querySelector('i');
        if (icon) {
            icon.className = theme === 'light' ? 'fas fa-sun' : 'fas fa-moon';
            icon.classList.add('rotate-icon');
            setTimeout(() => icon.classList.remove('rotate-icon'), 500);
        }
        if (DOMElements.themeToggleBtn) {
            DOMElements.themeToggleBtn.setAttribute('aria-pressed', theme === 'dark' ? 'false' : 'true');
        }
        document.querySelector('meta[name="theme-color"]')?.setAttribute('content',
            theme === 'dark' ? '#1a1a2e' : '#f2efe7');
        document.documentElement.dispatchEvent(new CustomEvent('theme-changed', { detail: { theme } }));
    };
    
    app.toggleDarkMode = () => {
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
        setTheme(currentTheme === 'dark' ? 'light' : 'dark');
    };
    
    // Initialize theme from saved or system preference
    const setupTheme = () => {
        const savedTheme = localStorage.getItem('theme');
        const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
        setTheme(savedTheme || (prefersDark ? 'dark' : 'light'));
    };
    
    const setInitialFileMetadata = () => {
        if (DOMElements.fileName && !DOMElements.fileName.textContent?.trim()) {
            DOMElements.fileName.textContent = "File";
        }
    };
    
    const showToast = (message, type = 'info', duration = 3000) => {
        if (!DOMElements.toast || !DOMElements.toastMessage) return;
        DOMElements.toastMessage.textContent = message;
        DOMElements.toast.className = 'toast show ' + type;
        DOMElements.toast.classList.remove('hide');
        if (DOMElements.toastIcon) {
            const icon = DOMElements.toastIcon.querySelector('i');
            if (icon) {
                const icons = {
                    success: 'fa-check-circle',
                    error: 'fa-times-circle',
                    warning: 'fa-exclamation-triangle',
                    info: 'fa-info-circle'
                };
                icon.className = `fas ${icons[type] || icons.info}`;
            }
        }
        clearTimeout(toastTimeout);
        toastTimeout = setTimeout(() => {
            DOMElements.toast.classList.add('hide');
            setTimeout(() => {
                DOMElements.toast.classList.remove('show', 'hide', 'success', 'error', 'warning', 'info');
            }, 400);
        }, duration);
    };
    
    const closeDropdown = (container, button) => {
        if (!container?.classList.contains('open')) return;
        container.classList.remove('open');
        button?.setAttribute('aria-expanded', 'false');
        document.removeEventListener('click', closeDropdownOnClickOutside, true);
        document.removeEventListener('keydown', handleDropdownKeys);
        button?.focus();
    };
    
    const openDropdownMenu = (container, menu, button, e, keyHandler, clickHandler) => {
        if (!container || !menu || !button) return;
        const isOpen = container.classList.toggle('open');
        button.setAttribute('aria-expanded', isOpen.toString());
        if (isOpen) {
            const firstItem = menu.querySelector('.dropdown-item[tabindex="0"]');
            if (firstItem) firstItem.focus();
            document.addEventListener('click', clickHandler, true);
            document.addEventListener('keydown', keyHandler);
        } else {
            document.removeEventListener('click', clickHandler, true);
            document.removeEventListener('keydown', keyHandler);
        }
        if (e) e.stopPropagation();
    };
    
    const closeDropdownOnClickOutside = e => {
        document.querySelectorAll('.dropdown-container.open').forEach(container => {
            if (!container.contains(e.target)) {
                const button = container.querySelector('[aria-haspopup="true"]');
                closeDropdown(container, button);
            }
        });
    };
    
    const handleDropdownKeys = e => {
        document.querySelectorAll('.dropdown-container.open').forEach(container => {
            const menu = container.querySelector('.dropdown-menu');
            const items = Array.from(menu?.querySelectorAll('.dropdown-item[tabindex="0"]') || []);
            if (items.length === 0) return;
    
            const activeIndex = items.findIndex(item => item === document.activeElement);
            let handled = true;
    
            switch (e.key) {
                case 'Escape':
                    const button = container.querySelector('[aria-haspopup="true"]');
                    closeDropdown(container, button);
                    break;
                case 'ArrowDown':
                    items[(activeIndex + 1) % items.length].focus();
                    break;
                case 'ArrowUp':
                    items[(activeIndex - 1 + items.length) % items.length].focus();
                    break;
                case 'Home':
                    items[0]?.focus();
                    break;
                case 'End':
                    items[items.length - 1]?.focus();
                    break;
                case 'Tab':
                    closeDropdown(container, container.querySelector('[aria-haspopup="true"]'));
                    handled = false;
                    break;
                default:
                    handled = false;
            }
    
            if (handled) {
                e.preventDefault();
                e.stopPropagation();
            }
        });
    };
    
    app.toggleDropdownMenu = (containerId, menuId, buttonId, e) => {
        const container = document.getElementById(containerId);
        const menu = document.getElementById(menuId);
        const button = document.getElementById(buttonId);
        openDropdownMenu(container, menu, button, e, handleDropdownKeys, closeDropdownOnClickOutside);
    };
    
    app.toggleStreamMenu = (e) => {
        app.toggleDropdownMenu('stream-dropdown-container', 'stream-menu', 'stream-btn-label', e);
    };
    
    app.closeStreamMenu = () => {
        const container = document.getElementById('stream-dropdown-container');
        const button = document.getElementById('stream-btn-label');
        closeDropdown(container, button);
    };
    
    const playerUrlBuilder = {
        'vlc-pc': url => `vlc://${url}`,
        'potplayer': url => `potplayer://${url}`,
        'mpc': url => `mpc://${url}`,
        'kmpc': url => `kmplayer://${url}`,
        'vlc': url => `intent:${url}#Intent;package=org.videolan.vlc;S.title=${encodeURIComponent(getCurrentFileName() || 'Video')};end`,
        'mx': url => `intent:${url}#Intent;package=com.mxtech.videoplayer.ad;S.title=${encodeURIComponent(getCurrentFileName() || 'Video')};end`,
        'mxpro': url => `intent:${url}#Intent;package=com.mxtech.videoplayer.pro;S.title=${encodeURIComponent(getCurrentFileName() || 'Video')};end`,
        'nplayer': url => `nplayer-${url}`,
        'splayer': url => `intent:${url}#Intent;action=com.young.simple.player.playback_online;package=com.young.simple.player;end`,
        'km': url => `intent:${url}#Intent;package=com.kmplayer;S.title=${encodeURIComponent(getCurrentFileName() || 'Video')};end`,
    };
    
    app.playOnline = type => {
        closeDropdown();
        const urlBuilder = playerUrlBuilder[type];
        const playerName = type.replace('-pc', ' (PC)')
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, str => str.toUpperCase());
        
        if (!urlBuilder || !finalUrl || !finalUrl.startsWith('http')) { 
            showToast(`Invalid URL or player type`, 'error'); 
            return; 
        }
        
        const appUrl = urlBuilder(finalUrl);
        
        try {
            const win = window.open(appUrl, '_blank');
            if (!win || win.closed || typeof win.closed === 'undefined') {
                showToast(`Trying to open ${playerName}...`, 'info');
                setTimeout(() => { window.location.href = appUrl; }, 300);
            } else { 
                showToast(`Launching ${playerName}...`, 'info'); 
            }
        } catch (err) { 
            console.error('Error opening external player:', err); 
            showToast(`Failed to open ${playerName}`, 'error'); 
        }
    };
    
    app.download = () => {
        if (!finalUrl || !finalUrl.startsWith('http')) { 
            showToast('Invalid URL', 'error'); 
            return; 
        }
        
        try {
            const link = document.createElement('a');
            link.href = finalUrl;
            
            let filename = "file";
            const currentTitle = getCurrentFileName();
            
            if (currentTitle && !currentTitle.toLowerCase().includes('loading')) {
                filename = currentTitle;
            } else {
                try {
                    const lastPart = new URL(finalUrl).pathname.split('/').pop();
                    if (lastPart) filename = decodeURIComponent(lastPart.split('.')[0]);
                } catch (e) {
                    console.error('Filename extraction error:', e);
                }
            }
            
            link.download = `${sanitizeFilename(filename)}.${getFileExtension(finalUrl)}`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            showToast('Download started', 'success');
        } catch (err) {
            console.error('Download error:', err);
            showToast('Download failed', 'error');
        }
    };
    
    app.copyLink = async () => { 
        if (!finalUrl || !finalUrl.startsWith('http')) { 
            showToast('No valid link', 'error'); 
            return; 
        }
        
        try {
            if (navigator.clipboard) {
                await navigator.clipboard.writeText(finalUrl); 
                showToast('Link copied!', 'success');
            } else {
                const textArea = document.createElement("textarea"); 
                textArea.value = finalUrl; 
                textArea.style.position = "fixed"; 
                textArea.style.opacity = "0"; 
                document.body.appendChild(textArea); 
                textArea.focus(); 
                textArea.select();
                
                const copySuccess = document.execCommand('copy'); 
                document.body.removeChild(textArea); 
                showToast(copySuccess ? 'Copied' : 'Copy failed', copySuccess ? 'success' : 'error'); 
            }
        } catch (e) { 
            showToast('Copy failed', 'error'); 
        } 
    };
    
    const init = () => {
        window.app = app;
        
        if (!finalUrl || !finalUrl.startsWith('http')) {
            console.error("Invalid URL detected:", finalUrl);
            showToast('Invalid media URL', 'error');
            return;
        }
        
        setupTheme();
        setInitialFileMetadata();
    
        const addRippleEffect = (e) => {
            const button = e.currentTarget;
            const oldRipple = button.querySelector('.ripple');
            if (oldRipple) oldRipple.remove();
    
            const rect = button.getBoundingClientRect();
            const ripple = document.createElement('span');
            ripple.className = 'ripple';
            const size = Math.max(rect.width, rect.height);
            ripple.style.width = ripple.style.height = size + 'px';
            ripple.style.left = (e.clientX - rect.left - size / 2) + 'px';
            ripple.style.top = (e.clientY - rect.top - size / 2) + 'px';
    
            button.appendChild(ripple);
    
            ripple.addEventListener('animationend', () => {
                ripple.remove();
            });
        };
    
        document.querySelectorAll('.action-button').forEach(btn => {
            btn.addEventListener('click', addRippleEffect, { passive: true });
        });
    
        if (document.readyState === 'complete') {
            initializePlayer();
        } else {
            window.addEventListener('load', initializePlayer, { once: true });
        }
        
        window.addEventListener('beforeunload', () => {
            clearTimeout(toastTimeout);
        });
    };
    
    const initializePlayer = () => {
        const playerElement = document.getElementById('player');
        if (!playerElement) {
            console.error('Player element not found');
            return;
        }
    
        try {
            const plyrInstance = new Plyr(playerElement, {
                controls: [
                    'play-large', 'play', 'progress', 'current-time', 'mute',
                    'volume', 'captions', 'settings', 'pip', 'airplay', 'fullscreen'
                ],
                settings: ['captions', 'quality', 'speed', 'loop', 'audio'],
                autoplay: false,
                hideControls: true,
                keyboard: { focused: true, global: true },
                previewThumbnails: { enabled: false },
                blankVideo: 'data:video/mp4;base64,AAAAHGZ0eXBpc29pc28yYXZjMW1wNDEAAAAIZnJlZQAAAu1tZGF0AAACrgYF//+q3EXpvebZSLeW',
                invertTime: false,
                loadSprite: true,
                iconUrl: 'https://cdn.plyr.io/3.7.8/plyr.svg',
                tooltips: { controls: true, seek: true },
                disableContextMenu: false,
                captions: { active: true, update: true, language: 'auto' },
                i18n: { audio: 'Audio tracks', qualityLabel: { 0: 'Auto' } }
            });
    
            window.player = plyrInstance;
    
            const playerEl = document.querySelector('.plyr');
            if (playerEl) {
                playerEl.style.setProperty('--plyr-video-background', '#1c1c2e');
                playerEl.style.setProperty('--plyr-video-control-color', '#ffffff');
                playerEl.style.setProperty('--plyr-video-control-color-hover', '#9292ff');
                playerEl.style.setProperty('--plyr-menu-background', '#2a2a40');
                playerEl.style.setProperty('--plyr-menu-color', '#ffffff');
                playerEl.style.setProperty('--plyr-tooltip-background', '#2a2a40');
                playerEl.style.setProperty('--plyr-tooltip-color', '#ffffff');
                playerEl.style.setProperty('--plyr-range-fill-background', '#7878ff');
                playerEl.style.setProperty('--plyr-video-progress-buffered-background', 'rgba(255, 255, 255, 0.25)');
            }
    
            playerElement.addEventListener('loadedmetadata', () => {
                updateVideoMetadata();
                if (playerElement.textTracks && playerElement.textTracks.length > 0) {
                    for (let i = 0; i < playerElement.textTracks.length; i++) {
                        const track = playerElement.textTracks[i];
                        if (track.kind === 'subtitles' || track.kind === 'captions') {
                            track.mode = 'showing';
                            break;
                        }
                    }
                    plyrInstance.captions?.toggle(true);
                }
            });
    
            plyrInstance.on('ready', () => {
                console.log('Plyr is ready');
                updateVideoMetadata();
                plyrInstance.volume = 1.0;
    
                const container = document.querySelector('.player-container');
                if (container) {
                    const observer = new IntersectionObserver((entries) => {
                        entries.forEach(entry => {
                            if (entry.isIntersecting) {
                                plyrInstance.volume = 1.0;
                                observer.disconnect();
                            }
                        });
                    }, { threshold: 0.1 });
                    observer.observe(container);
                }
            });
        } catch (error) {
            console.error('Failed to initialize Plyr:', error);
            showToast('Video player failed to initialize', 'error');
        }
    };
    
    const updateVideoMetadata = () => {
        const playerElement = document.getElementById('player');
        if (!playerElement) return;
        const duration = playerElement.duration;
        const videoWidth = playerElement.videoWidth;
        const videoHeight = playerElement.videoHeight;
        const formatTime = (secs, showHrs = false) => {
            if (isNaN(secs) || secs < 0) return showHrs ? '0:00:00' : '0:00';
            secs = Math.round(secs);
            const h = Math.floor(secs / 3600);
            const m = Math.floor((secs % 3600) / 60);
            const s = secs % 60;
            return (showHrs || h > 0) ? `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}` : `${m}:${s.toString().padStart(2, '0')}`;
        };
        const metaContainer = document.querySelector('.file-meta');
        if (metaContainer) {
            const updateOrCreateMetaItem = (id, value, prefix) => {
                let element = metaContainer.querySelector(`#${id}`);
                if (!element) {
                    element = document.createElement('span');
                    element.id = id;
                    metaContainer.appendChild(element);
                }
                element.textContent = `${prefix}: ${value}`;
            };
            updateOrCreateMetaItem('file-duration', (!isNaN(duration) && duration > 0) ? formatTime(duration, duration >= 3600) : 'N/A', 'Dur');
            updateOrCreateMetaItem('file-resolution', (videoWidth > 0 && videoHeight > 0) ? `${videoWidth}x${videoHeight}` : 'N/A', 'Res');
        }
    };
    
    if (document.readyState === 'loading') 
        document.addEventListener('DOMContentLoaded', init); 
    else 
        init();
    
    document.addEventListener('DOMContentLoaded', () => {
        const loadingOverlay = document.getElementById('loading-overlay');
        if (loadingOverlay) {
            setTimeout(() => {
                loadingOverlay.classList.add('fade-out');
                setTimeout(() => loadingOverlay.remove(), 500);
            }, 2000);
        }
    });
    
            trackInfo.className = 'track-info';
            const trackIcon = document.createElement('div');
            trackIcon.className = 'track-icon';
            trackIcon.innerHTML = '<i class="fas fa-ban"></i>';
            const trackName = document.createElement('div');
            trackName.className = 'track-name';
            trackName.textContent = 'Off';
            trackInfo.appendChild(trackIcon);
            trackInfo.appendChild(trackName);
            offButton.appendChild(trackInfo);
            subtitleList.appendChild(offButton);
            for (let i = 0; i < videoElement.textTracks.length; i++) {
                const track = videoElement.textTracks[i];
                if (track.kind !== 'subtitles' && track.kind !== 'captions') continue;
                const button = document.createElement('button');
                button.type = 'button';
                button.className = 'track-item';
                button.classList.toggle('active', track.mode === 'showing');
                button.onclick = () => {
                    for (let j = 0; j < videoElement.textTracks.length; j++) {
                        videoElement.textTracks[j].mode = (j === i) ? 'showing' : 'hidden';
                    }
                    if (player && player.captions) {
                        player.captions.toggle(true);
                        player.captions.language = track.language || 'en';
                    }
                    updateSubtitleTracksList(videoElement, player);
                };
                const trackInfo = document.createElement('div');
                trackInfo.className = 'track-info';
                const trackIcon = document.createElement('div');
                trackIcon.className = 'track-icon';
                trackIcon.innerHTML = '<i class="fas fa-closed-captioning"></i>';
                const trackName = document.createElement('div');
                trackName.className = 'track-name';
    
        if (!audioList) return;
        audioList.innerHTML = '';
        let hasAudioTracks = false;
        if (videoElement.audioTracks && videoElement.audioTracks.length > 1) {
            hasAudioTracks = true;
            for (let i = 0; i < videoElement.audioTracks.length; i++) {
                const track = videoElement.audioTracks[i];
                const button = document.createElement('button');
                button.type = 'button';
                button.className = 'track-item';
                button.classList.toggle('active', track.enabled);
                button.onclick = () => {
                    for (let j = 0; j < videoElement.audioTracks.length; j++) {
                        videoElement.audioTracks[j].enabled = (j === i);
                    }
                    updateAudioTracksList(videoElement, player);
                };
                const trackInfo = document.createElement('div');
                trackInfo.className = 'track-info';
                const trackIcon = document.createElement('div');
                trackIcon.className = 'track-icon';
                trackIcon.innerHTML = '<i class="fas fa-volume-up"></i>';
                const trackName = document.createElement('div');
                trackName.className = 'track-name';
                trackName.textContent = track.label || `Audio ${i + 1}`;
                const trackLang = document.createElement('div');
                trackLang.className = 'track-badge';
                trackLang.textContent = track.language || 'N/A';
                trackInfo.appendChild(trackIcon);
                trackInfo.appendChild(trackName);
                button.appendChild(trackInfo);
                button.appendChild(trackLang);
                audioList.appendChild(button);
            }
        }
        if (window.alternativeAudioTracks && window.alternativeAudioTracks.length > 0) {
            hasAudioTracks = true;
            if (!videoElement.audioTracks || videoElement.audioTracks.length <= 1) {
                const defaultButton = document.createElement('button');
                defaultButton.type = 'button';
                defaultButton.className = 'track-item default-audio-track';
                defaultButton.classList.add('active');
                defaultButton.onclick = () => {
                    if (window.alternativeAudioTracks) {
                        window.alternativeAudioTracks.forEach(track => {
                            if (track.element) {
                                track.element.pause();
                                track.element.currentTime = 0;
                                track.active = false;
                            }
                        });
                    }
                    videoElement.muted = false;
                    document.querySelectorAll('.track-item').forEach(el => el.classList.remove('active'));
                    defaultButton.classList.add('active');
                };
                const trackInfo = document.createElement('div');
                trackInfo.className = 'track-info';
                const trackIcon = document.createElement('div');
                trackIcon.className = 'track-icon';
                trackIcon.innerHTML = '<i class="fas fa-volume-up"></i>';
                const trackName = document.createElement('div');
                trackName.className = 'track-name';
                trackName.textContent = 'Original Audio';
                trackInfo.appendChild(trackIcon);
                trackInfo.appendChild(trackName);
                defaultButton.appendChild(trackInfo);
                audioList.appendChild(defaultButton);
            }
            window.alternativeAudioTracks.forEach((track, index) => {
                const button = document.createElement('button');
                button.type = 'button';
                button.className = 'track-item alternative-track';
                button.classList.toggle('active', track.active === true);
                button.onclick = () => {
                    if (window.alternativeAudioTracks) {
                        window.alternativeAudioTracks.forEach(t => {
                            if (t.element) {
                                t.element.pause();
                                t.active = false;
                            }
                        });
                    }
                    if (track.element) {
                        videoElement.muted = true;
                        track.element.currentTime = videoElement.currentTime;
                        track.element.play();
                    }
                    document.querySelectorAll('.track-item').forEach(el => el.classList.remove('active'));
                    button.classList.add('active');
                };
                const trackInfo = document.createElement('div');
                trackInfo.className = 'track-info';
                const trackIcon = document.createElement('div');
                trackIcon.className = 'track-icon';
                trackIcon.innerHTML = '<i class="fas fa-volume-up"></i>';
                const trackName = document.createElement('div');
                trackName.className = 'track-name';
                trackName.textContent = track.label || `Alt Audio ${index + 1}`;
                const trackLang = document.createElement('div');
                trackLang.className = 'track-badge';
                trackLang.textContent = track.language || 'N/A';
                trackInfo.appendChild(trackIcon);
                trackInfo.appendChild(trackName);
                button.appendChild(trackInfo);
                button.appendChild(trackLang);
                audioList.appendChild(button);
            });
        }
    }
    
    })();
    
