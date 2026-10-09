/**
 * Happy — lógica da aplicação (navegação + mapa Leaflet).
 * Organização: CONFIG/dados → MapModule → Router → bootstrap.
 * Mantém `window.toggleView` para compatibilidade com os onclick do HTML.
 */
(function () {
    'use strict';

    // ---------- Configuração & dados ----------
    const CONFIG = Object.freeze({
        center: [-27.2092052, -49.6401092], // Rio do Sul - SC
        zoom: 15,
        tileUrl: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        views: { landing: 'landing-view', map: 'map-view', profile: 'profile-view', create: 'create-view' },
        defaultView: 'landing'
    });

    // Dados fictícios (mock). Novos cadastros são adicionados em memória.
    const ORPHANAGES = [
        {
            id: 1,
            name: 'Orfanato Esperança',
            address: 'Rua dos Orfanatos, 100',
            lat: -27.2092052, lng: -49.6401092,
            about: 'Presta assistência a crianças de 06 a 15 anos que se encontre em situação de risco e/ou vulnerabilidade social.',
            instructions: 'Venha como se sentir mais à vontade e traga muito amor e paciência para dar.',
            hours: 'Das 8h às 18h',
            openOnWeekends: true,
            whatsapp: '5547999999999',
            images: []
        },
        {
            id: 2,
            name: 'Lar das Crianças',
            address: 'Av. Central, 250',
            lat: -27.2150, lng: -49.6480,
            about: 'Acolhe crianças e adolescentes, oferecendo reforço escolar e atividades recreativas.',
            instructions: 'Visitas devem ser agendadas com antecedência por WhatsApp.',
            hours: 'Das 9h às 17h',
            openOnWeekends: false,
            whatsapp: '5547988888888',
            images: []
        }
    ];
    let nextId = ORPHANAGES.length + 1;
    const findOrphanage = (id) => ORPHANAGES.find((o) => String(o.id) === String(id));

    // ---------- Utilitários ----------
    const $ = (id) => document.getElementById(id);
    const setText = (id, v) => { const el = $(id); if (el) el.textContent = v; };
    const escapeHTML = (str) => String(str).replace(/[&<>"']/g, (c) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));

    // ---------- Mapa ----------
    const MapModule = (function () {
        let map = null;
        let markersLayer = null;

        function createIcon() {
            return L.divIcon({
                className: 'custom-div-icon',
                html: `<div style="background-color: #15C3D6; width: 48px; height: 48px; border-radius: 20px 20px 0 20px; transform: rotate(45deg); display: flex; align-items: center; justify-content: center; border: 3px solid white; box-shadow: 0 4px 12px rgba(0,0,0,0.25);">
                          <i class="bi bi-emoji-smile-fill" style="color: #FFD666; font-size: 24px; transform: rotate(-45deg);"></i>
                       </div>`,
                iconSize: [48, 48],
                iconAnchor: [24, 48],
                popupAnchor: [0, -48]
            });
        }

        function popupContent(o) {
            return `
                <div style="font-family: 'Nunito', sans-serif; padding: 4px;">
                    <strong style="color: #4D6F80; font-size: 16px;">${escapeHTML(o.name)}</strong><br/>
                    <span style="color: #5C8599; font-size: 13px;">${escapeHTML(o.address)}</span><br/>
                    <a href="#profile/${o.id}" data-view="profile/${o.id}" style="color: #15C3D6; text-decoration: none; font-weight: bold; margin-top: 6px; display: inline-block;">Ver detalhes →</a>
                </div>`;
        }

        function renderMarkers(list) {
            if (!map) return;
            markersLayer.clearLayers();
            const icon = createIcon();
            list.forEach((o) => {
                if (!Number.isFinite(o.lat) || !Number.isFinite(o.lng)) return;
                L.marker([o.lat, o.lng], { icon, title: o.name })
                    .bindPopup(popupContent(o))
                    .addTo(markersLayer);
            });
        }

        function init() {
            if (map) return true;
            if (typeof window.L === 'undefined') {
                console.error('[Happy] Leaflet não carregado.');
                return false;
            }
            const el = document.getElementById('map');
            if (!el) return false;

            map = L.map(el, { zoomControl: false }).setView(CONFIG.center, CONFIG.zoom);
            L.control.zoom({ position: 'topright' }).addTo(map);
            L.tileLayer(CONFIG.tileUrl, { attribution: CONFIG.attribution, maxZoom: 19 }).addTo(map);
            markersLayer = L.layerGroup().addTo(map);
            renderMarkers(ORPHANAGES);
            return true;
        }

        /** Recalcula dimensões após o container sair de display:none. */
        function refresh() {
            if (!map) return;
            requestAnimationFrame(() => map.invalidateSize());
        }

        function show() {
            init();
            refresh();
        }

        function addOrphanage(o) { ORPHANAGES.push(o); renderMarkers(ORPHANAGES); }

        function focusOn(o) {
            if (map) map.setView([o.lat, o.lng], CONFIG.zoom);
        }

        return { show, renderMarkers, addOrphanage, focusOn, list: () => ORPHANAGES, icon: createIcon };
    })();

    // ---------- Perfil (detalhes) ----------
    const ProfileModule = (function () {
        let miniMap = null, miniMarker = null;

        function setPhoto(images) {
            const photo = $('profile-photo');
            const thumbs = $('profile-thumbs');
            const list = images && images.length ? images : [];
            if (photo) {
                if (list.length) { photo.src = list[0]; photo.hidden = false; } else { photo.removeAttribute('src'); photo.hidden = true; }
            }
            if (thumbs) {
                thumbs.replaceChildren();
                list.forEach((src, i) => {
                    const img = document.createElement('img');
                    img.src = src; img.alt = `Foto ${i + 1}`;
                    img.addEventListener('click', () => { if (photo) photo.src = src; });
                    thumbs.appendChild(img);
                });
            }
        }

        function renderMiniMap(o) {
            const el = $('profile-map');
            if (!el || typeof window.L === 'undefined') return;
            if (!miniMap) {
                miniMap = L.map(el, {
                    dragging: false, touchZoom: false, doubleClickZoom: false,
                    scrollWheelZoom: false, boxZoom: false, keyboard: false, zoomControl: false
                });
                L.tileLayer(CONFIG.tileUrl, { attribution: CONFIG.attribution, maxZoom: 19 }).addTo(miniMap);
                miniMarker = L.marker([o.lat, o.lng], { icon: MapModule.icon(), interactive: false }).addTo(miniMap);
            }
            miniMap.setView([o.lat, o.lng], 16);
            miniMarker.setLatLng([o.lat, o.lng]);
            requestAnimationFrame(() => miniMap.invalidateSize());
        }

        function show(id) {
            const o = findOrphanage(id);
            if (!o) { Router.go('map'); return; }
            setText('profile-name', o.name);
            setText('profile-about', o.about);
            setText('profile-instructions', o.instructions);
            setText('profile-hours', o.hours);
            setPhoto(o.images);

            const wk = $('profile-weekend');
            if (wk) { wk.classList.toggle('open', o.openOnWeekends); wk.classList.toggle('closed', !o.openOnWeekends); }
            setText('profile-weekend-text', o.openOnWeekends ? 'Atendemos fim de semana' : 'Não atendemos fim de semana');

            const route = $('profile-route');
            if (route) {
                route.href = `https://www.google.com/maps/dir/?api=1&destination=${o.lat},${o.lng}`;
                route.target = '_blank'; route.rel = 'noopener noreferrer';
            }
            const wa = $('profile-whatsapp');
            if (wa) {
                const phone = String(o.whatsapp || '').replace(/\D/g, '');
                wa.href = phone ? `https://wa.me/${phone}` : '#';
                wa.target = '_blank'; wa.rel = 'noopener noreferrer';
            }
            renderMiniMap(o);
        }

        return { show };
    })();

    // ---------- Formulário de cadastro ("01. Dados") ----------
    const FormModule = (function () {
        let map = null, marker = null, position = null, weekend = null;
        let previews = [];
        const MAX_ABOUT = 300, MAX_FILE_MB = 5;

        function placeMarker(latlng) {
            position = { lat: latlng.lat, lng: latlng.lng };
            if (marker) marker.setLatLng(latlng);
            else marker = L.marker(latlng, { icon: MapModule.icon() }).addTo(map);
            const el = $('map-create');
            if (el) el.classList.remove('is-invalid');
        }

        function initMap() {
            if (map) return;
            const el = $('map-create');
            if (!el || typeof window.L === 'undefined') return;
            map = L.map(el).setView(CONFIG.center, CONFIG.zoom);
            L.tileLayer(CONFIG.tileUrl, { attribution: CONFIG.attribution, maxZoom: 19 }).addTo(map);
            map.on('click', (e) => placeMarker(e.latlng));
        }

        function reset() {
            const form = $('orphanage-form');
            if (form) form.reset();
            if (marker) { marker.remove(); marker = null; }
            position = null; weekend = null;
            clearPreviews();
            document.querySelectorAll('.toggle-btn').forEach((b) => b.classList.remove('active'));
            document.querySelectorAll('.is-invalid').forEach((n) => n.classList.remove('is-invalid'));
            setText('about-count', `0/${MAX_ABOUT}`);
            setError('');
        }

        function clearPreviews() {
            previews.forEach((u) => URL.revokeObjectURL(u));
            previews = [];
            const box = $('image-preview');
            if (box) box.replaceChildren();
        }

        function setError(msg) { setText('form-error', msg); }

        function onImages(e) {
            clearPreviews();
            const box = $('image-preview');
            Array.from(e.target.files).forEach((f) => {
                if (!f.type.startsWith('image/') || f.size > MAX_FILE_MB * 1024 * 1024) return;
                const url = URL.createObjectURL(f);
                previews.push(url);
                if (box) {
                    const img = document.createElement('img');
                    img.src = url; img.alt = f.name;
                    box.appendChild(img);
                }
            });
        }

        function setWeekend(value) {
            weekend = value;
            const hidden = document.querySelector('#orphanage-form [name="weekend"]');
            if (hidden) hidden.value = String(value);
            document.querySelectorAll('.toggle-btn').forEach((b) => {
                b.classList.toggle('active', (b.dataset.weekend === 'true') === value);
            });
            const grp = document.querySelector('.toggle-btn')?.parentElement;
            if (grp) grp.classList.remove('is-invalid');
        }

        function validate(form) {
            const f = form.elements;
            const errors = [];
            const mark = (el, bad) => { if (el) el.classList.toggle('is-invalid', bad); return bad; };
            if (mark(f.name, !f.name.value.trim())) errors.push('Informe o nome.');
            if (mark(f.about, !f.about.value.trim() || f.about.value.length > MAX_ABOUT)) errors.push(`Descreva o orfanato (até ${MAX_ABOUT} caracteres).`);
            if (mark(f.whatsapp, String(f.whatsapp.value).replace(/\D/g, '').length < 10)) errors.push('WhatsApp inválido.');
            if (mark(f.instructions, !f.instructions.value.trim())) errors.push('Informe as instruções de visita.');
            if (mark(f.hours, !f.hours.value.trim())) errors.push('Informe o horário de visitas.');
            if (!position) { mark($('map-create'), true); errors.push('Clique no mapa para marcar a localização.'); }
            if (weekend === null) { document.querySelector('.toggle-btn')?.parentElement?.classList.add('is-invalid'); errors.push('Informe se atende fim de semana.'); }
            return errors;
        }

        function onSubmit(e) {
            e.preventDefault();
            const form = e.currentTarget;
            const errors = validate(form);
            if (errors.length) { setError(errors.join(' ')); return; }
            const f = form.elements;
            const o = {
                id: nextId++,
                name: f.name.value.trim(),
                address: `${position.lat.toFixed(5)}, ${position.lng.toFixed(5)}`,
                lat: position.lat, lng: position.lng,
                about: f.about.value.trim(),
                instructions: f.instructions.value.trim(),
                hours: f.hours.value.trim(),
                openOnWeekends: weekend,
                whatsapp: f.whatsapp.value,
                images: previews.slice()
            };
            previews = []; // posse das URLs passa ao cadastro
            MapModule.addOrphanage(o);
            reset();
            Router.go(`profile/${o.id}`);
        }

        function bind() {
            const form = $('orphanage-form');
            if (!form) return;
            form.addEventListener('submit', onSubmit);
            const about = form.elements.about;
            if (about) about.addEventListener('input', () => setText('about-count', `${about.value.length}/${MAX_ABOUT}`));
            const images = form.elements.images;
            if (images) images.addEventListener('change', onImages);
            form.addEventListener('input', (e) => e.target.classList?.remove('is-invalid'));
            document.querySelectorAll('.toggle-btn').forEach((b) =>
                b.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); setWeekend(b.dataset.weekend === 'true'); }));
        }

        function show() {
            initMap();
            if (map) requestAnimationFrame(() => map.invalidateSize());
        }

        return { bind, show, reset };
    })();

    // ---------- Navegação (hash router) ----------
    // Rotas: #map | #create | #profile/<id> | (vazio = landing)
    const Router = (function () {
        let current = null;
        let currentKey = null;

        function parse(raw) {
            const [name, param] = String(raw || '').replace(/^#/, '').split('/');
            return Object.prototype.hasOwnProperty.call(CONFIG.views, name)
                ? { name, param: param || null }
                : { name: CONFIG.defaultView, param: null };
        }

        function render(raw) {
            const { name, param } = parse(raw);
            const key = `${name}/${param || ''}`;
            if (key === currentKey) return;
            if (name === 'profile' && !findOrphanage(param)) { go('map'); return; }
            Object.entries(CONFIG.views).forEach(([n, id]) => {
                const el = $(id);
                if (!el) return;
                el.classList.toggle('d-none', n !== name);
                el.setAttribute('aria-hidden', String(n !== name));
            });
            if (current === 'create' && name !== 'create') FormModule.reset();
            current = name; currentKey = key;
            if (name === 'map') MapModule.show();
            else if (name === 'create') FormModule.show();
            else if (name === 'profile') ProfileModule.show(param);
            window.scrollTo(0, 0);
        }

        function go(raw) {
            const { name, param } = parse(raw);
            const route = param ? `${name}/${param}` : name;
            const hash = name === CONFIG.defaultView ? '' : `#${route}`;
            if (location.hash !== hash) {
                history.pushState(null, '', hash || location.pathname + location.search);
            }
            render(route);
        }

        function fromLocation() { render(location.hash); }

        function start() {
            window.addEventListener('popstate', fromLocation);
            window.addEventListener('hashchange', fromLocation);
            // Delegação: qualquer elemento com data-view="map|landing|create|profile/<id>"
            document.addEventListener('click', (e) => {
                const trigger = e.target instanceof Element ? e.target.closest('[data-view]') : null;
                if (!trigger) return;
                e.preventDefault();
                go(trigger.dataset.view);
            });
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && current && current !== 'landing') go(current === 'map' ? 'landing' : 'map');
            });
            FormModule.bind();
            fromLocation();
        }

        return { start, go };
    })();

    // API pública (compatível com onclick="toggleView('map')")
    window.toggleView = Router.go;
    window.Happy = Object.freeze({ go: Router.go, renderMarkers: MapModule.renderMarkers });

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', Router.start);
    } else {
        Router.start();
    }
})();
