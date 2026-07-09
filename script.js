/* ============================================
   WEDDING MEMORIES — PHOTO GALLERY
   Premium JavaScript — Full Functionality
   ============================================ */

(function () {
  'use strict';

  // Photos come from data.js (photoData) + user-uploaded photos in localStorage
  const USER_UPLOADS_KEY = 'wedding_gallery_uploads';

  function getPhotos() {
    // Always start from the latest data.js file
    const base = (typeof photoData !== 'undefined') ? photoData : [];
    // Merge user-uploaded photos on top
    try {
      const uploads = JSON.parse(localStorage.getItem(USER_UPLOADS_KEY)) || [];
      return [...base, ...uploads];
    } catch {
      return base;
    }
  }

  function savePhotos(photos) {
    // We only save user-uploaded photos separately
    // (base photos come from data.js)
    const base = (typeof photoData !== 'undefined') ? photoData : [];
    const baseIds = new Set(base.map(p => p.id));
    const uploads = photos.filter(p => !baseIds.has(p.id));
    localStorage.setItem(USER_UPLOADS_KEY, JSON.stringify(uploads));
  }

  function addPhotos(newPhotos) {
    const photos = getPhotos();
    photos.push(...newPhotos);
    savePhotos(photos);
    return photos;
  }

  function deletePhoto(id) {
    const photos = getPhotos().filter(p => p.id !== id);
    savePhotos(photos);
    return photos;
  }

  function toggleFavorite(id) {
    const photos = getPhotos();
    const photo = photos.find(p => p.id === id);
    if (photo) {
      photo.favorite = !photo.favorite;
      savePhotos(photos);
    }
    return photos;
  }

  function renamePhoto(id, newName) {
    const photos = getPhotos();
    const photo = photos.find(p => p.id === id);
    if (photo) {
      photo.title = newName;
      savePhotos(photos);
    }
    return photos;
  }

  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 6);
  }

  // ──────────── DEMO DATA ────────────
  function seedDemoData() {
    // Clear ALL old stale localStorage keys so data.js is always the source of truth
    const oldKeys = ['wedding_gallery_photos', 'weddingGallery', 'gallery_photos', 'photos'];
    oldKeys.forEach(key => localStorage.removeItem(key));
  }

  // ──────────── STATE ────────────
  let currentAlbum = 'all';
  let currentView = 'gallery'; // gallery | albums | favorites
  let currentLayout = 'masonry'; // masonry | grid | list
  let currentSort = 'newest';
  let searchQuery = '';
  let lightboxIndex = 0;
  let filteredPhotos = [];
  let contextPhotoId = null;

  // ──────────── DOM REFERENCES ────────────
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  const galleryGrid = $('#galleryGrid');
  const emptyState = $('#emptyState');
  const searchInput = $('#searchInput');
  const sortSelect = $('#sortSelect');
  const lightbox = $('#lightbox');
  const lightboxImg = $('#lightboxImg');
  const lightboxTitle = $('#lightboxTitle');
  const lightboxCounter = $('#lightboxCounter');
  const contextMenu = $('#contextMenu');
  const toast = $('#toast');
  const navbar = $('#navbar');

  // ──────────── INIT ────────────
  document.addEventListener('DOMContentLoaded', () => {
    seedDemoData();
    render();
    bindEvents();
    initScrollAnimations();

    // ──────────── SPLASH SCREEN ────────────
    const splash = document.getElementById('splash-screen');
    if (splash) {
      setTimeout(() => {
        splash.classList.add('hidden');
        setTimeout(() => splash.style.display = 'none', 1500);
      }, 2000);
    }

    // ──────────── PARTICLE CANVAS ────────────
    initParticles();
  });

  // ──────────── RENDER ────────────
  function render() {
    const gallerySection = document.querySelector('.gallery-section');
    const toolbar = document.getElementById('toolbar');
    const videoSection = document.getElementById('videoSection');

    if (currentView === 'video') {
      if (gallerySection) gallerySection.style.display = 'none';
      if (toolbar) toolbar.style.display = 'none';
      if (videoSection) videoSection.style.display = 'block';

      // Trigger staggered fade-in animations
      const memElements = videoSection.querySelectorAll('.mem-animate');
      memElements.forEach(el => el.classList.remove('mem-visible'));
      setTimeout(() => {
        memElements.forEach(el => el.classList.add('mem-visible'));
      }, 50);

      const video = document.getElementById('cinematicVideo');
      if (video) {
        // Ensure it starts muted for autoplay policies
        video.play().catch(e => console.log('Autoplay blocked:', e));
      }

      return;
    } else {
      if (gallerySection) gallerySection.style.display = 'block';
      if (toolbar) toolbar.style.display = 'block';
      if (videoSection) videoSection.style.display = 'none';
      const video = document.getElementById('cinematicVideo');
      if (video) video.pause();
    }

    const allPhotos = getPhotos();

    // Filter
    filteredPhotos = allPhotos.filter(p => {
      let albumMatch = currentAlbum === 'all' || p.album === currentAlbum;
      if (currentAlbum === 'orang_tua' || currentAlbum === 'semua_orang_tua') albumMatch = p.album.startsWith('orang_tua');
      if (currentAlbum === 'keluarga' || currentAlbum === 'semua_keluarga') albumMatch = p.album.startsWith('keluarga');
      
      const favMatch = currentView !== 'favorites' || p.favorite;
      const searchMatch = !searchQuery || p.title.toLowerCase().includes(searchQuery.toLowerCase()) || p.album.toLowerCase().includes(searchQuery.toLowerCase());
      return albumMatch && favMatch && searchMatch;
    });

    // Sort
    filteredPhotos.sort((a, b) => {
      switch (currentSort) {
        case 'newest': return new Date(b.date) - new Date(a.date);
        case 'oldest': return new Date(a.date) - new Date(b.date);
        case 'name-asc': return a.title.localeCompare(b.title);
        case 'name-desc': return b.title.localeCompare(a.title);
        default: return 0;
      }
    });

    // Build cards
    if (filteredPhotos.length === 0) {
      galleryGrid.innerHTML = '';
      emptyState.style.display = 'block';
    } else {
      emptyState.style.display = 'none';
      galleryGrid.innerHTML = filteredPhotos.map((photo, i) => buildPhotoCard(photo, i)).join('');
    }

    // Layout class
    galleryGrid.classList.remove('cols-2', 'cols-3', 'list-view');
    if (currentLayout === 'grid') galleryGrid.classList.add('cols-3');
    if (currentLayout === 'list') galleryGrid.classList.add('list-view');

    // Update counts
    updateCounts(allPhotos);

    // Initialize Scroll Reveal Observer
    const revealElements = document.querySelectorAll('.photo-card.reveal');
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('active');
          observer.unobserve(entry.target);
        }
      });
    }, { rootMargin: "0px 0px -50px 0px" });

    revealElements.forEach(el => revealObserver.observe(el));
  }

  function buildPhotoCard(photo, index) {
    const albumLabels = {
      'pasangan': 'Pasangan',
      'orang_tua_wahyu': 'Orang Tua Pihak Wahyu',
      'orang_tua_desy': 'Orang Tua Pihak Desy',
      'keluarga_wahyu': 'Keluarga Pihak Wahyu',
      'keluarga_desy': 'Keluarga Pihak Desy',
      'teman': 'Teman / Sahabat',
      'tamu': 'Tamu'
    };

    const dateStr = new Date(photo.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });

    return `
      <div class="photo-card reveal" data-id="${photo.id}" data-index="${index}">
        <img src="${photo.src}" alt="${photo.title}" loading="lazy">
        <div class="photo-overlay">
          <div class="photo-overlay-top">
            <button class="photo-action-btn ${photo.favorite ? 'favorited' : ''}" data-action="favorite" title="Favorit">
              <svg viewBox="0 0 24 24" fill="${photo.favorite ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
            </button>
            <button class="photo-action-btn" data-action="more" title="Lainnya">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
            </button>
          </div>
          <div class="photo-overlay-bottom">
            <div class="photo-info-title">${photo.title}</div>
            <div class="photo-info-meta">${dateStr}</div>
            <div class="photo-info-album">${albumLabels[photo.album] || photo.album}</div>
          </div>
        </div>
      </div>
    `;
  }

  function updateCounts(allPhotos) {
    const counts = { all: allPhotos.length };
    counts['pasangan'] = allPhotos.filter(p => p.album === 'pasangan').length;
    counts['orang_tua'] = allPhotos.filter(p => p.album.startsWith('orang_tua')).length;
    counts['keluarga'] = allPhotos.filter(p => p.album.startsWith('keluarga')).length;
    counts['teman'] = allPhotos.filter(p => p.album === 'teman').length;
    counts['tamu'] = allPhotos.filter(p => p.album === 'tamu').length;

    const el = (id) => document.getElementById(id);
    if (el('countAll')) el('countAll').textContent = counts.all;
    if (el('countPasangan')) el('countPasangan').textContent = counts.pasangan;
    if (el('countOrangTua')) el('countOrangTua').textContent = counts.orang_tua;
    if (el('countKeluarga')) el('countKeluarga').textContent = counts.keluarga;
    if (el('countTeman')) el('countTeman').textContent = counts.teman;
    if (el('countTamu')) el('countTamu').textContent = counts.tamu;

    // Hero stats
    if (el('statPhotos')) el('statPhotos').textContent = allPhotos.length;
    if (el('statAlbums')) {
      const usedAlbums = new Set(allPhotos.map(p => p.album));
      el('statAlbums').textContent = usedAlbums.size;
    }
    if (el('statFavorites')) el('statFavorites').textContent = allPhotos.filter(p => p.favorite).length;
  }

  // ──────────── EVENTS ────────────
  function bindEvents() {
    // Navbar scroll
    window.addEventListener('scroll', () => {
      navbar.classList.toggle('scrolled', window.scrollY > 50);
    });

    // Nav tabs
    $$('.nav-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        $$('.nav-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        currentView = tab.dataset.view;
        if (currentView === 'favorites') {
          currentAlbum = 'all';
          $$('.filter-pill').forEach(p => p.classList.remove('active'));
          $$('.filter-pill[data-album="all"]').forEach(p => p.classList.add('active'));
        }
        render();
      });
    });

    // Mobile nav
    function closeMobileNav() {
      $('#mobileNav').classList.remove('open');
      $('#mobileNavOverlay').classList.remove('open');
    }

    $('#menuToggle').addEventListener('click', () => {
      $('#mobileNav').classList.toggle('open');
      $('#mobileNavOverlay').classList.toggle('open');
    });

    // New close button inside the panel
    const mobileNavClose = $('#mobileNavClose');
    if (mobileNavClose) {
      mobileNavClose.addEventListener('click', closeMobileNav);
    }

    $('#mobileNavOverlay').addEventListener('click', closeMobileNav);

    $$('.mobile-nav-item').forEach(a => {
      a.addEventListener('click', (e) => {
        e.preventDefault();
        $$('.mobile-nav-item').forEach(x => x.classList.remove('active'));
        a.classList.add('active');
        currentView = a.dataset.view;
        $$('.nav-tab').forEach(t => t.classList.remove('active'));
        $$(`.nav-tab[data-view="${currentView}"]`).forEach(t => t.classList.add('active'));
        closeMobileNav();
        render();
      });
    });

    // Filter pills
    $$('.filter-pill:not(.sub-pill)').forEach(pill => {
      pill.addEventListener('click', () => {
        $$('.filter-pill:not(.sub-pill)').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        
        // Hide all sub-filters first
        if ($('#subFilterOrangTua')) $('#subFilterOrangTua').style.display = 'none';
        if ($('#subFilterKeluarga')) $('#subFilterKeluarga').style.display = 'none';

        currentAlbum = pill.dataset.album;

        // Show sub-filter if orang_tua or keluarga
        if (currentAlbum === 'orang_tua' && $('#subFilterOrangTua')) {
          $('#subFilterOrangTua').style.display = 'flex';
          $$('#subFilterOrangTua .sub-pill').forEach(p => p.classList.remove('active'));
          $$('#subFilterOrangTua .sub-pill[data-subalbum="semua_orang_tua"]')[0].classList.add('active');
          currentAlbum = 'semua_orang_tua';
        } else if (currentAlbum === 'keluarga' && $('#subFilterKeluarga')) {
          $('#subFilterKeluarga').style.display = 'flex';
          $$('#subFilterKeluarga .sub-pill').forEach(p => p.classList.remove('active'));
          $$('#subFilterKeluarga .sub-pill[data-subalbum="semua_keluarga"]')[0].classList.add('active');
          currentAlbum = 'semua_keluarga';
        }

        render();
      });
    });

    // Sub filter pills
    $$('.sub-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        // Remove active from siblings
        const siblings = pill.parentElement.querySelectorAll('.sub-pill');
        siblings.forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        currentAlbum = pill.dataset.subalbum;
        render();
      });
    });



    // View toggle
    $$('.view-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        $$('.view-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentLayout = btn.dataset.view;
        render();
      });
    });

    // Gallery click delegation
    galleryGrid.addEventListener('click', handleGalleryClick);

    // Context menu delegation
    contextMenu.addEventListener('click', handleContextAction);

    // Close context menu
    document.addEventListener('click', (e) => {
      if (!contextMenu.contains(e.target)) {
        contextMenu.classList.remove('active');
      }
    });

    // Lightbox
    $('#lightboxClose').addEventListener('click', closeLightbox);
    $('#lightboxPrev').addEventListener('click', () => navigateLightbox(-1));
    $('#lightboxNext').addEventListener('click', () => navigateLightbox(1));
    lightbox.addEventListener('click', (e) => {
      if (e.target === lightbox) closeLightbox();
    });

    // Keyboard
    document.addEventListener('keydown', (e) => {
      if (lightbox.classList.contains('active')) {
        if (e.key === 'Escape') closeLightbox();
        if (e.key === 'ArrowLeft') navigateLightbox(-1);
        if (e.key === 'ArrowRight') navigateLightbox(1);
      }
    });

    const heroToggleBtn = $('#heroToggleBtn');
    const heroSection = $('#hero');
    if (heroToggleBtn && heroSection) {
      const iconEyeOff = heroToggleBtn.querySelector('.icon-eye-off');
      const iconEyeOn = heroToggleBtn.querySelector('.icon-eye-on');
      
      heroToggleBtn.addEventListener('click', () => {
        heroSection.classList.toggle('video-mode');
        if (heroSection.classList.contains('video-mode')) {
          iconEyeOff.style.display = 'none';
          iconEyeOn.style.display = 'block';
        } else {
          iconEyeOff.style.display = 'block';
          iconEyeOn.style.display = 'none';
        }
      });
    }

    // Music Player
    const musicBtn = $('#musicBtn');
    const bgMusic = $('#bgMusic');
    if (musicBtn && bgMusic) {
      const iconPlay = musicBtn.querySelector('.icon-play');
      const iconPause = musicBtn.querySelector('.icon-pause');
      let isPlaying = false;
  
      function toggleMusic() {
        if (isPlaying) {
          bgMusic.pause();
          iconPlay.style.display = 'block';
          iconPause.style.display = 'none';
          musicBtn.classList.remove('playing');
        } else {
          bgMusic.play().then(() => {
            iconPlay.style.display = 'none';
            iconPause.style.display = 'block';
            musicBtn.classList.add('playing');
          }).catch(e => {
            showToast('Tidak ada file music.mp3 ditemukan', 'error');
            console.log("Audio play error", e);
          });
        }
        isPlaying = !isPlaying;
      }
  
      musicBtn.addEventListener('click', toggleMusic);

      // Pause background music when cinematic video starts playing WITH sound
      const cinematicVideo = document.getElementById('cinematicVideo');
      if (cinematicVideo) {
        cinematicVideo.addEventListener('play', () => {
          if (isPlaying && !cinematicVideo.muted) {
            toggleMusic();
          }
        });
      }
    }
  }

  // ──────────── GALLERY CLICK HANDLER ────────────
  function handleGalleryClick(e) {
    const card = e.target.closest('.photo-card');
    if (!card) return;

    const photoId = card.dataset.id;
    const actionBtn = e.target.closest('.photo-action-btn');

    if (actionBtn) {
      e.stopPropagation();
      const action = actionBtn.dataset.action;

      if (action === 'favorite') {
        toggleFavorite(photoId);
        render();
        showToast('Favorit diperbarui ❤️', 'info');
      } else if (action === 'more') {
        showContextMenu(e, photoId);
      }
      return;
    }

    // Click on card = open lightbox
    const index = parseInt(card.dataset.index);
    openLightbox(index);
  }

  // ──────────── LIGHTBOX ────────────
  function openLightbox(index) {
    lightboxIndex = index;
    updateLightbox();
    lightbox.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    lightbox.classList.remove('active');
    document.body.style.overflow = '';
  }

  function navigateLightbox(direction) {
    lightboxIndex += direction;
    if (lightboxIndex < 0) lightboxIndex = filteredPhotos.length - 1;
    if (lightboxIndex >= filteredPhotos.length) lightboxIndex = 0;
    updateLightbox();
  }

  function updateLightbox() {
    const photo = filteredPhotos[lightboxIndex];
    if (!photo) return;
    lightboxImg.src = photo.src;
    lightboxImg.alt = photo.title;
    lightboxTitle.textContent = photo.title;
    lightboxCounter.textContent = `${lightboxIndex + 1} / ${filteredPhotos.length}`;
  }

  // ──────────── CONTEXT MENU ────────────
  function showContextMenu(e, photoId) {
    contextPhotoId = photoId;
    const photo = getPhotos().find(p => p.id === photoId);

    // Update fav label
    const favItem = contextMenu.querySelector('[data-action="favorite"] span');
    if (favItem && photo) {
      favItem.textContent = photo.favorite ? 'Hapus Favorit' : 'Tambah Favorit';
    }

    const rect = e.target.closest('.photo-action-btn').getBoundingClientRect();
    let x = rect.left;
    let y = rect.bottom + 8;

    // Keep inside viewport
    const menuW = 200;
    const menuH = 260;
    if (x + menuW > window.innerWidth) x = window.innerWidth - menuW - 16;
    if (y + menuH > window.innerHeight) y = rect.top - menuH - 8;

    contextMenu.style.left = x + 'px';
    contextMenu.style.top = y + 'px';
    contextMenu.classList.add('active');
  }

  function handleContextAction(e) {
    const item = e.target.closest('.context-menu-item');
    if (!item || !contextPhotoId) return;

    const action = item.dataset.action;
    contextMenu.classList.remove('active');

    switch (action) {
      case 'view':
        const index = filteredPhotos.findIndex(p => p.id === contextPhotoId);
        if (index >= 0) openLightbox(index);
        break;
      case 'favorite':
        toggleFavorite(contextPhotoId);
        render();
        showToast('Favorit diperbarui ❤️', 'info');
        break;
      case 'rename':
        const photo = getPhotos().find(p => p.id === contextPhotoId);
        if (photo) {
          const newName = prompt('Nama baru:', photo.title);
          if (newName && newName.trim()) {
            renamePhoto(contextPhotoId, newName.trim());
            render();
            showToast('Nama foto diperbarui ✏️', 'info');
          }
        }
        break;
      case 'delete':
        if (confirm('Hapus foto ini?')) {
          deletePhoto(contextPhotoId);
          render();
          showToast('Foto berhasil dihapus 🗑️', 'success');
        }
        break;
    }

    contextPhotoId = null;
  }



  // ──────────── TOAST ────────────
  function showToast(message, type = 'info') {
    toast.textContent = message;
    toast.className = 'toast ' + type + ' show';
    clearTimeout(toast._timeout);
    toast._timeout = setTimeout(() => {
      toast.classList.remove('show');
    }, 3000);
  }

  // ──────────── SCROLL ANIMATIONS ────────────
  function initScrollAnimations() {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -60px 0px', threshold: 0.1 });

    $$('.animate-on-scroll').forEach(el => observer.observe(el));
  }

  // ──────────── PARTICLES LOGIC ────────────
  function initParticles() {
    const canvas = document.getElementById('particle-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;
    const particles = [];
    
    window.addEventListener('resize', () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    });

    class Particle {
      constructor() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.size = Math.random() * 2 + 0.5;
        this.speedX = Math.random() * 0.5 - 0.25;
        this.speedY = Math.random() * -0.5 - 0.1;
        this.opacity = Math.random() * 0.5 + 0.1;
      }
      update() {
        this.x += this.speedX;
        this.y += this.speedY;
        if (this.y < 0) {
          this.y = height;
          this.x = Math.random() * width;
        }
      }
      draw() {
        ctx.fillStyle = `rgba(201, 169, 110, ${this.opacity})`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    for (let i = 0; i < 60; i++) {
      particles.push(new Particle());
    }

    function animate() {
      ctx.clearRect(0, 0, width, height);
      particles.forEach(p => {
        p.update();
        p.draw();
      });
      requestAnimationFrame(animate);
    }
    animate();
  }

  function initVideoSound() {
    const video = document.getElementById('cinematicVideo');
    const toggleBtn = document.getElementById('soundToggleBtn');
    if (!video || !toggleBtn) return;

    const iconMute = toggleBtn.querySelector('.icon-mute');
    const iconUnmute = toggleBtn.querySelector('.icon-unmute');

    toggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      video.muted = !video.muted;
      
      if (video.muted) {
        iconMute.style.display = 'block';
        iconUnmute.style.display = 'none';
      } else {
        iconMute.style.display = 'none';
        iconUnmute.style.display = 'block';
        
        // Pause background music if it is currently playing
        const musicBtn = document.getElementById('musicBtn');
        if (musicBtn && musicBtn.classList.contains('playing')) {
          musicBtn.click();
        }
      }
    });
  }

  function initVideoGallery() {
    const playlistContainer = document.getElementById('videoPlaylist');
    const mainVideo = document.getElementById('cinematicVideo');
    if (!playlistContainer || !mainVideo || typeof videoData === 'undefined') return;

    // Hide playlist if only 1 video
    if (videoData.length <= 1) {
      playlistContainer.style.display = 'none';
      return;
    }

    let currentPlayingId = videoData[0].id;

    function renderPlaylist() {
      playlistContainer.innerHTML = '';
      videoData.forEach(vid => {
        const item = document.createElement('div');
        item.className = `playlist-item ${vid.id === currentPlayingId ? 'active' : ''}`;
        
        item.innerHTML = `
          <img src="${vid.poster}" class="playlist-thumbnail" alt="${vid.title}">
          <div class="playlist-overlay">
            <h4 class="playlist-title">${vid.title}</h4>
            <span class="playlist-date">${vid.date}</span>
          </div>
          <div class="play-icon-overlay">
            <svg viewBox="0 0 24 24" width="24" height="24"><path fill="currentColor" d="M8 5v14l11-7z"/></svg>
          </div>
        `;

        item.addEventListener('click', () => {
          if (currentPlayingId === vid.id) return; // already playing
          
          currentPlayingId = vid.id;
          
          // Update main video player
          const source = mainVideo.querySelector('source');
          source.src = vid.src;
          mainVideo.poster = vid.poster;
          mainVideo.load();
          mainVideo.play().catch(e => console.log('Autoplay blocked:', e));
          
          // Update video info text
          document.querySelector('.video-title').innerHTML = vid.title; // assume we remove the Desy & Wahyu span logic or let it be
          document.querySelector('.video-date').textContent = vid.date;
          
          // For the quote, we need to extract the quote mark HTML to preserve it
          const quoteContainer = document.querySelector('.video-quote');
          const quoteMarks = `<span class="quote-mark">"</span>`;
          quoteContainer.innerHTML = `${quoteMarks} ${vid.desc} ${quoteMarks}`;

          // Re-render playlist to update 'active' class
          renderPlaylist();
          
          // Scroll to top of video section smoothly
          document.getElementById('videoSection').scrollIntoView({ behavior: 'smooth' });
        });

        playlistContainer.appendChild(item);
      });
    }

    renderPlaylist();
  }

  // Initialize
  initParticles();
  initVideoSound();
  initVideoGallery();

})();
