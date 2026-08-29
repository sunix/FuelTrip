import { appConfig } from '../config/env';
import { FUEL_LABELS, type FuelType } from '../domain/fuel';
import { optimizeFuelStops, type OptimizationStrategy } from '../domain/optimizer';
import type { Location } from '../domain/route';
import { parisLilleRoute, mockStations } from './mock-data';

interface SearchState {
  origin: Location;
  destination: Location;
  fuelType: FuelType;
  strategy: OptimizationStrategy;
}

const STRATEGY_LABELS: Record<OptimizationStrategy, string> = {
  BEST_COMPROMISE: 'Meilleur compromis',
  CHEAPEST: 'Moins cher',
  MINIMAL_DETOUR: 'Moins de détour',
};

const STRATEGY_EMOJIS: Record<OptimizationStrategy, string> = {
  BEST_COMPROMISE: '🏆',
  CHEAPEST: '💰',
  MINIMAL_DETOUR: '⚡',
};

const mapQuery = (point: { latitude: number; longitude: number }): string =>
  `${point.latitude},${point.longitude}`;

const formatEuro = (value: number): string =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value);

const formatDistance = (meters: number): string => `${(meters / 1000).toFixed(1)} km`;

const formatDuration = (seconds: number): string => `+${Math.round(seconds / 60)} min`;

const createStrategyButton = (strategy: OptimizationStrategy, activeStrategy: OptimizationStrategy): string => `
  <button class="strategy-button ${strategy === activeStrategy ? 'active' : ''}" data-strategy="${strategy}">
    ${STRATEGY_LABELS[strategy]}
  </button>
`;

export const initializeApp = (rootElement: HTMLElement): void => {
  const state: SearchState = {
    origin: { label: 'Paris' },
    destination: { label: 'Lille' },
    fuelType: 'E10',
    strategy: 'BEST_COMPROMISE',
  };

  const render = (status?: string, error = false): void => {
    const recommendations = optimizeFuelStops(parisLilleRoute, mockStations, {
      fuelType: state.fuelType,
      strategy: state.strategy,
      maxDistanceFromRouteMeters: appConfig.maxDistanceFromRouteMeters,
      limit: 3,
    });

    const noPriceMessage =
      recommendations.length === 0
        ? '<p class="status warning">Prix indisponible pour ce carburant sur les stations candidates.</p>'
        : '';

    const recommendationCards = recommendations
      .map(
        (recommendation) => `
        <article class="card">
          <h3>${STRATEGY_EMOJIS[state.strategy]} ${recommendation.stationName}</h3>
          <p>${FUEL_LABELS[recommendation.fuelType]} : <strong>${formatEuro(recommendation.pricePerLiter)}</strong>/L</p>
          <p>Distance du trajet : ${formatDistance(recommendation.distanceFromRouteMeters)}</p>
          <p>Détour estimé : ${formatDistance(recommendation.estimatedDetourMeters)}</p>
          <p>Temps supplémentaire estimé : ${formatDuration(recommendation.estimatedExtraTimeSeconds)}</p>
          <a class="navigate" href="https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(
            state.origin.label,
          )}&destination=${encodeURIComponent(
            state.destination.label,
          )}&waypoints=${encodeURIComponent(
            mapQuery({ latitude: recommendation.latitude, longitude: recommendation.longitude }),
          )}&travelmode=driving" target="_blank" rel="noreferrer">Naviguer vers cette station</a>
        </article>
      `,
      )
      .join('');

    rootElement.innerHTML = `
      <main class="app-shell">
        <h1>Fuel Stop</h1>
        <form id="search-form" class="panel">
          <label>
            Départ
            <input type="text" id="origin" value="${state.origin.label}" placeholder="Ma position" required />
          </label>
          <button type="button" id="geolocate" class="secondary">Ma position</button>

          <label>
            Destination
            <input type="text" id="destination" value="${state.destination.label}" required />
          </label>

          <label>
            Carburant
            <select id="fuel">
              ${Object.entries(FUEL_LABELS)
                .map(
                  ([value, label]) =>
                    `<option value="${value}" ${value === state.fuelType ? 'selected' : ''}>${label}</option>`,
                )
                .join('')}
            </select>
          </label>

          <button type="submit" class="primary">Rechercher</button>
          <p class="hint">Mode MVP: résultats calculés sur une fixture Paris → Lille.</p>
        </form>

        <section class="panel">
          <h2>Itinéraire</h2>
          <p>${state.origin.label} → ${state.destination.label}</p>
          <p>${Math.round(parisLilleRoute.distanceMeters / 1000)} km · ${Math.round(
            parisLilleRoute.durationSeconds / 3600,
          )}h${String(Math.round((parisLilleRoute.durationSeconds % 3600) / 60)).padStart(2, '0')}</p>
        </section>

        <section class="panel">
          <h2>Meilleures stations</h2>
          <div class="strategy-switch">
            ${createStrategyButton('BEST_COMPROMISE', state.strategy)}
            ${createStrategyButton('CHEAPEST', state.strategy)}
            ${createStrategyButton('MINIMAL_DETOUR', state.strategy)}
          </div>
          ${status ? `<p class="status ${error ? 'error' : ''}">${status}</p>` : ''}
          ${noPriceMessage}
          ${
            recommendationCards ||
            '<p class="status warning">Aucune station trouvée près de l’itinéraire.</p>'
          }
        </section>
      </main>
    `;

    const form = rootElement.querySelector<HTMLFormElement>('#search-form');
    const geolocateButton = rootElement.querySelector<HTMLButtonElement>('#geolocate');

    form?.addEventListener('submit', (event) => {
      event.preventDefault();
      const originInput = rootElement.querySelector<HTMLInputElement>('#origin');
      const destinationInput = rootElement.querySelector<HTMLInputElement>('#destination');
      const fuelInput = rootElement.querySelector<HTMLSelectElement>('#fuel');

      state.origin.label = originInput?.value.trim() || state.origin.label;
      state.destination.label = destinationInput?.value.trim() || state.destination.label;
      state.fuelType = (fuelInput?.value as FuelType) || state.fuelType;

      render('Chargement des stations...');
      window.setTimeout(() => render(), 250);
    });

    geolocateButton?.addEventListener('click', () => {
      if (!navigator.geolocation) {
        render('Erreur API : géolocalisation indisponible sur ce navigateur.', true);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          state.origin = {
            label: `${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}`,
            point: {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            },
          };
          render('Départ mis à jour avec votre position.');
        },
        () => {
          render('Géolocalisation refusée.', true);
        },
      );
    });

    rootElement.querySelectorAll<HTMLButtonElement>('[data-strategy]').forEach((button) => {
      button.addEventListener('click', () => {
        state.strategy = button.dataset.strategy as OptimizationStrategy;
        render();
      });
    });
  };

  render();
};
