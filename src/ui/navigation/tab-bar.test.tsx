import { fireEvent, render, screen } from '@testing-library/react-native';

import { TabBar, type NativeTabBarProps } from '@/ui/navigation/tab-bar';

describe('TabBar', () => {
  const routes = [
    { key: 'route-atlas', name: 'index' },
    { key: 'route-journal', name: 'journal' },
    { key: 'route-scanner', name: 'scanner' },
    { key: 'route-help', name: 'help' },
    { key: 'route-profile', name: 'profile' },
  ];

  const descriptors = {
    'route-atlas': { options: { title: 'Atlas' } },
    'route-journal': { options: { title: 'Dziennik' } },
    'route-scanner': { options: { title: 'Skaner' } },
    'route-help': { options: { title: 'Pomoc' } },
    'route-profile': { options: { title: 'Profil' } },
  };

  const createMockProps = (
    index: number,
    emitMock = jest.fn(() => ({ defaultPrevented: false })),
    navigateToTabMock = jest.fn(),
  ): NativeTabBarProps =>
    ({
      state: { index, routes },
      descriptors,
      emitter: { emit: emitMock },
      navigateToTab: navigateToTabMock,
      insets: { top: 0, bottom: 0, left: 0, right: 0 },
    }) as unknown as NativeTabBarProps;

  it('renders all 5 tabs with scanner CTA pill', async () => {
    const props = createMockProps(0);

    await render(<TabBar {...props} theme="light" />);

    expect(screen.getByTestId('tab-bar')).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'Atlas' })).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'Dziennik' })).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'Skaner' })).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'Pomoc' })).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'Profil' })).toBeTruthy();
  });

  it('navigates when tab pressed', async () => {
    const emit = jest.fn(() => ({ defaultPrevented: false }));
    const navigateToTab = jest.fn();
    const props = createMockProps(0, emit, navigateToTab);

    await render(<TabBar {...props} theme="light" />);

    fireEvent.press(screen.getByRole('tab', { name: 'Skaner' }));
    expect(emit).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'tabPress', target: 'route-scanner' }),
    );
    expect(navigateToTab).toHaveBeenCalledWith('route-scanner');
  });

  it('renders with high contrast borders', async () => {
    const props = createMockProps(1);

    await render(<TabBar {...props} theme="highContrast" />);

    const tabbar = screen.getByTestId('tab-bar');
    expect(tabbar.props.style).toEqual(
      expect.objectContaining({
        borderTopWidth: 2,
        borderTopColor: '#FFFFFF',
        backgroundColor: '#000000',
      }),
    );
  });
});
