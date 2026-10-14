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
 * Push a species card on the current tab. A look-alike stacks, so Back returns
 * to the previous card. Opening an id already on the stack truncates back to
 * that card instead of growing A, B, A, B.
 */
export function openSpecies(stack: ViewStack, speciesId: string): ViewStack {
  const existing = stack.pushed.findIndex(
    (screen) => screen.name === 'species' && screen.speciesId === speciesId,
  );
  if (existing >= 0) {
    if (existing === stack.pushed.length - 1) return stack;
    return { tab: stack.tab, pushed: stack.pushed.slice(0, existing + 1) };
  }
  const next: SpeciesScreen = { name: 'species', speciesId };
  return { tab: stack.tab, pushed: [...stack.pushed, next] };
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

/** A species card keeps the tab it was opened from. Settings and preparation highlight none. */
export function highlightedTab(stack: ViewStack): RootTab | null {
  const top = stack.pushed[stack.pushed.length - 1];
  if (!top || top.name === 'species') return stack.tab;
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

/** A species id pushes a card on the current tab. Null pops a species frame and leaves settings alone. */
export function selectSpecies(stack: ViewStack, speciesId: string | null): ViewStack {
  if (speciesId) return openSpecies(stack, speciesId);
  const top = stack.pushed[stack.pushed.length - 1];
  if (top?.name !== 'species') return stack;
  const popped = applyHardwareBack(stack);
  return popped.handled ? popped.stack : stack;
}

/** Which `screens` entry is visible. A species card uses the source tab's slot. */
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
