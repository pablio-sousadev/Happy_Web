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
        views: { landing: 'landing-view', map: 'map-view' },
        defaultView: 'landing'
    });

    const ORPHANAGES = [
        { id: 1, name: 'Orfanato Esperança', address: 'Rua dos Orfanatos, 100', lat: -27.2092052, lng: -49.6401092 }
    ];

    // ---------- Utilitários ----------
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
                    <a href="#orphanage-${o.id}" style="color: #15C3D6; text-decoration: none; font-weight: bold; margin-top: 6px; display: inline-block;">Ver detalhes →</a>
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

        return { show, renderMarkers };
    })();

    // ---------- Navegação (hash router) ----------
    const Router = (function () {
        let current = null;

        function resolve(view) {
            return Object.prototype.hasOwnProperty.call(CONFIG.views, view) ? view : CONFIG.defaultView;
        }

        function render(view) {
            view = resolve(view);
            if (view === current) return;
            Object.entries(CONFIG.views).forEach(([name, id]) => {
                const el = document.getElementById(id);
                if (!el) return;
                const active = name === view;
                el.classList.toggle('d-none', !active);
                el.setAttribute('aria-hidden', String(!active));
            });
            current = view;
            if (view === 'map') MapModule.show();
            window.scrollTo(0, 0);
        }

        function go(view) {
            view = resolve(view);
            const hash = view === CONFIG.defaultView ? '' : `#${view}`;
            if (location.hash !== hash) {
                history.pushState(null, '', hash || location.pathname + location.search);
            }
            render(view);
        }

        function fromLocation() {
            render(location.hash.replace(/^#/, ''));
        }

        function start() {
            window.addEventListener('popstate', fromLocation);
            window.addEventListener('hashchange', fromLocation);
            // Delegação: qualquer elemento com data-view="map|landing"
            document.addEventListener('click', (e) => {
                const trigger = e.target instanceof Element ? e.target.closest('[data-view]') : null;
                if (!trigger) return;
                e.preventDefault();
                go(trigger.dataset.view);
            });
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && current === 'map') go('landing');
            });
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
