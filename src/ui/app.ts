import { OpenDataFuelStationProvider } from '../api/fuel-prices';
import { GoogleRouteProvider } from '../api/google-routes';
import { appConfig } from '../config/env';
import { FUEL_LABELS, type FuelType } from '../domain/fuel';
import { optimizeFuelStops, type OptimizationStrategy } from '../domain/optimizer';
import type { Location, Route } from '../domain/route';
import type { Station } from '../domain/station';
import { RouteService } from '../services/route-service';
import { StationService } from '../services/station-service';

interface SearchState {
  origin: Location;
  destination: Location;
  fuelType: FuelType;
  strategy: OptimizationStrategy;
}

interface SearchResult {
  route: Route;
  stations: Station[];
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

// A location typed or edited by hand loses any coordinates a previous
// geolocation click may have attached to it; unmodified input keeps them.
const updateLocationFromInput = (location: Location, inputValue: string): Location => {
  const label = inputValue.trim();
  if (!label || label === location.label) {
    return location;
  }

  return { label };
};

export const initializeApp = (rootElement: HTMLElement): void => {
  const routeService = new RouteService(new GoogleRouteProvider(appConfig.googleMapsApiKey));
  const stationService = new StationService(new OpenDataFuelStationProvider(appConfig.fuelApiBaseUrl));

  const state: SearchState = {
    origin: { label: '' },
    destination: { label: '' },
    fuelType: 'E10',
    strategy: 'BEST_COMPROMISE',
  };

  let lastResult: SearchResult | null = null;

  const render = (status?: string, error = false): void => {
    const recommendations = lastResult
      ? optimizeFuelStops(lastResult.route, lastResult.stations, {
          fuelType: state.fuelType,
          strategy: state.strategy,
          maxDistanceFromRouteMeters: appConfig.maxDistanceFromRouteMeters,
          limit: 3,
        })
      : [];

    const noPriceMessage =
      lastResult && recommendations.length === 0
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

    const routeSummary = lastResult
      ? `<p>${Math.round(lastResult.route.distanceMeters / 1000)} km · ${Math.round(
          lastResult.route.durationSeconds / 3600,
        )}h${String(Math.round((lastResult.route.durationSeconds % 3600) / 60)).padStart(2, '0')}</p>`
      : '<p class="hint">Renseignez un départ et une destination puis lancez une recherche.</p>';

    rootElement.innerHTML = `
      <main class="app-shell">
        <h1>Fuel Stop</h1>
        <form id="search-form" class="panel">
          <label>
            Départ
            <input type="text" id="origin" value="${state.origin.label}" placeholder="Ma position, ou une adresse" required />
          </label>
          <button type="button" id="geolocate" class="secondary">Ma position</button>

          <label>
            Destination
            <input type="text" id="destination" value="${state.destination.label}" placeholder="Ville ou adresse d'arrivée" required />
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
        </form>

        <section class="panel">
          <h2>Itinéraire</h2>
          <p>${state.origin.label || '—'} → ${state.destination.label || '—'}</p>
          ${routeSummary}
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
            lastResult
              ? recommendationCards ||
                '<p class="status warning">Aucune station trouvée près de l’itinéraire.</p>'
              : ''
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

      state.origin = updateLocationFromInput(state.origin, originInput?.value ?? '');
      state.destination = updateLocationFromInput(state.destination, destinationInput?.value ?? '');
      state.fuelType = (fuelInput?.value as FuelType) || state.fuelType;

      void search();
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

  const search = async (): Promise<void> => {
    render('Recherche en cours...');

    try {
      const route = await routeService.calculateRoute(state.origin, state.destination);
      const stations = await stationService.getStations(route, state.fuelType);
      lastResult = { route, stations };
      render();
    } catch (searchError) {
      lastResult = null;
      const message = searchError instanceof Error ? searchError.message : 'Erreur inconnue.';
      render(`Erreur API : ${message}`, true);
    }
  };

  render();
};
