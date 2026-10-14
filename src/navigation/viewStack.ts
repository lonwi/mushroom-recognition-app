export type RootTab = 'SCANNER' | 'ATLAS' | 'JOURNAL' | 'SAFETY';
export type ShellTab = RootTab | 'SETTINGS' | 'PREPARATION';

type SpeciesScreen = { readonly name: 'species'; readonly speciesId: string };
type SettingsScreen = { readonly name: 'settings' };
type PreparationScreen = { readonly name: 'preparation' };
type PushedScreen = SpeciesScreen | SettingsScreen | PreparationScreen;

/** The root tab stays underneath. Pushed screens are what the Android back button pops. */
export type ViewStack = {
  readonly tab: RootTab;
  readonly pushed: readonly PushedScreen[];
};

export type VisibleRoute =
  | { readonly kind: 'tab'; readonly tab: RootTab }
  | { readonly kind: 'species'; readonly speciesId: string }
  | { readonly kind: 'settings' }
  | { readonly kind: 'preparation' };

export type HardwareBackResult =
  | { readonly handled: false }
  | { readonly handled: true; readonly stack: ViewStack };

export function initialViewStack(): ViewStack {
  return { tab: 'SCANNER', pushed: [] };
}

export function selectTab(stack: ViewStack, tab: RootTab): ViewStack {
  return { tab, pushed: [] };
}

/**
 * A species card always opens on the atlas. Replacing the current species
 * (a look-alike) keeps a single detail frame, so Back returns to the atlas.
 */
export function openSpecies(stack: ViewStack, speciesId: string): ViewStack {
  const next: SpeciesScreen = { name: 'species', speciesId };
  const top = stack.pushed[stack.pushed.length - 1];
  if (top?.name === 'species') {
    return { tab: 'ATLAS', pushed: [...stack.pushed.slice(0, -1), next] };
  }
  return { tab: 'ATLAS', pushed: [next] };
}

export function openSettings(stack: ViewStack): ViewStack {
  return pushOnce(stack, { name: 'settings' });
}

export function openPreparation(stack: ViewStack): ViewStack {
  return pushOnce(stack, { name: 'preparation' });
}

/** Root tabs exit the app. Anything pushed is popped and the event is consumed. */
export function applyHardwareBack(stack: ViewStack): HardwareBackResult {
  if (stack.pushed.length === 0) {
    return { handled: false };
  }
  return {
    handled: true,
    stack: { tab: stack.tab, pushed: stack.pushed.slice(0, -1) },
  };
}

/** Species detail stays on the atlas tab. Settings and preparation highlight none. */
export function highlightedTab(stack: ViewStack): RootTab | null {
  const top = stack.pushed[stack.pushed.length - 1];
  if (!top) return stack.tab;
  if (top.name === 'species') return 'ATLAS';
  return null;
}

export function visibleRoute(stack: ViewStack): VisibleRoute {
  const top = stack.pushed[stack.pushed.length - 1];
  if (!top) return { kind: 'tab', tab: stack.tab };
  if (top.name === 'species') return { kind: 'species', speciesId: top.speciesId };
  if (top.name === 'settings') return { kind: 'settings' };
  return { kind: 'preparation' };
}

/** The header logo drops every pushed screen and returns to the scanner. */
export function resetToScanner(stack: ViewStack): ViewStack {
  if (stack.tab === 'SCANNER' && stack.pushed.length === 0) return stack;
  return initialViewStack();
}

/** Header and tab bar keep calling these. Settings and preparation push; root tabs clear. */
export function activateShellTab(stack: ViewStack, tab: ShellTab): ViewStack {
  if (tab === 'SETTINGS') return openSettings(stack);
  if (tab === 'PREPARATION') return openPreparation(stack);
  if (tab === 'SCANNER') return resetToScanner(stack);
  return selectTab(stack, tab);
}

/** A species id opens atlas detail. Null pops a species frame and leaves settings alone. */
export function selectSpecies(stack: ViewStack, speciesId: string | null): ViewStack {
  if (speciesId) return openSpecies(stack, speciesId);
  const top = stack.pushed[stack.pushed.length - 1];
  if (top?.name !== 'species') return stack;
  const popped = applyHardwareBack(stack);
  return popped.handled ? popped.stack : stack;
}

/** Which `screens` entry is visible. Species stays on the atlas entry. */
export function shellScreen(stack: ViewStack): ShellTab {
  const highlighted = highlightedTab(stack);
  if (highlighted) return highlighted;
  const top = stack.pushed[stack.pushed.length - 1];
  return top?.name === 'settings' ? 'SETTINGS' : 'PREPARATION';
}

function pushOnce(stack: ViewStack, screen: SettingsScreen | PreparationScreen): ViewStack {
  const top = stack.pushed[stack.pushed.length - 1];
  if (top?.name === screen.name) return stack;
  return { tab: stack.tab, pushed: [...stack.pushed, screen] };
}
