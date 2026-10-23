import { test, expect, type Page } from '@playwright/test';

async function captionContrast(page: Page, testId: string): Promise<number> {
  return page.getByTestId(testId).evaluate((el) => {
    const parse = (value: string): [number, number, number] | null => {
      const match = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(value);
      if (!match) {
        return null;
      }
      return [Number(match[1]), Number(match[2]), Number(match[3])];
    };
    const channel = (value: number) => {
      const scaled = value / 255;
      return scaled <= 0.03928 ? scaled / 12.92 : ((scaled + 0.055) / 1.055) ** 2.4;
    };
    const luminance = ([red, green, blue]: [number, number, number]) =>
      0.2126 * channel(red) + 0.7152 * channel(green) + 0.0722 * channel(blue);
    const foreground = parse(getComputedStyle(el).color);
    let node: Element | null = el;
    let background: [number, number, number] | null = null;
    while (node) {
      const parsed = parse(getComputedStyle(node).backgroundColor);
      if (parsed && getComputedStyle(node).backgroundColor !== 'rgba(0, 0, 0, 0)') {
        background = parsed;
        break;
      }
      node = node.parentElement;
    }
    if (!foreground || !background) {
      return 0;
    }
    const lighter = Math.max(luminance(foreground), luminance(background));
    const darker = Math.min(luminance(foreground), luminance(background));
    return (lighter + 0.05) / (darker + 0.05);
  });
}

async function columnBox(page: Page, testId: string): Promise<{ x: number; width: number }> {
  const box = await page.getByTestId(testId).boundingBox();
  if (!box) {
    throw new Error(`missing column ${testId}`);
  }
  return box;
}

test.describe('Grzybobranie AI - Storybook UI Component Tests', () => {
  test('sulphur tuft comparison pairs the cortina with a membranous ring', async ({ page }) => {
    await page.goto('/iframe.html?id=mushroom-sulphurhoneycomparison--light');
    await expect(page.getByTestId('comparison-lead')).toContainText('nie ma błoniastego pierścienia');
    await expect(page.getByTestId('comparison-limit')).toContainText('grzyboznawcy');
    await expect(page.getByTestId('comparison-author-ring-hypholoma-strefa-trzon')).toContainText('Jeffrey Lee');
    await expect(page.getByTestId('comparison-photo-ring-armillaria-pierscien-trzony')).toBeVisible();
    await expect(page.getByTestId('comparison-trait-gills')).toBeVisible();
    await expect(page.getByTestId('comparison-trait-cap')).toBeVisible();
    await page.getByTestId('comparison-side-galerina-ring').scrollIntoViewIfNeeded();
    await expect(page.getByTestId('comparison-side-galerina-ring')).toBeVisible();
    await expect(page.getByTestId('comparison-warning')).toHaveText(
      'Zawiera amatoksyny. Żadna pojedyncza cecha, w tym pierścień, nie potwierdza opieńki.',
    );
    await expect(page.getByTestId('comparison-galerina-heading-ring')).toHaveText(
      'Hełmówka jadowita (Galerina marginata) – śmiertelnie trująca',
    );
    await expect(page.locator('body')).not.toContainText('gorzk');
    await expect(page.locator('body')).not.toContainText('smak');
    await expect(page.locator('body')).not.toContainText('331784845');
  });

  test('funeral bell column stays readable on a narrow screen', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    await page.goto('/iframe.html?id=mushroom-sulphurhoneycomparison--light');
    const hyph = await columnBox(page, 'comparison-side-hypholoma-ring');
    const arm = await columnBox(page, 'comparison-side-armillaria-ring');
    const gal = await columnBox(page, 'comparison-side-galerina-ring');
    expect(hyph.width).toBeGreaterThanOrEqual(148);
    expect(arm.width).toBeGreaterThanOrEqual(148);
    expect(gal.width).toBeGreaterThanOrEqual(148);
    expect(hyph.x).toBeLessThan(arm.x);
    expect(arm.x).toBeLessThan(gal.x);
    await page.getByTestId('comparison-side-galerina-ring').scrollIntoViewIfNeeded();
    await expect(page.getByTestId('comparison-caption-ring-galerina-pierscien')).toBeVisible();
    await expect(page.getByTestId('comparison-galerina-heading-ring')).toContainText('śmiertelnie trująca');
    expect(await captionContrast(page, 'comparison-caption-ring-galerina-pierscien')).toBeGreaterThanOrEqual(4.5);
  });

  test('funeral bell captions stay readable in the dark story', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    await page.goto('/iframe.html?id=mushroom-sulphurhoneycomparison--dark');
    await expect(page.getByTestId('comparison-warning')).toContainText('Zawiera amatoksyny');
    expect(await captionContrast(page, 'comparison-caption-cap-galerina-kapelusz')).toBeGreaterThanOrEqual(4.5);
    const gal = await columnBox(page, 'comparison-side-galerina-cap');
    expect(gal.width).toBeGreaterThanOrEqual(148);
  });

  test('EdibilityBadge renders all 4 edibility levels', async ({ page }) => {
    await page.goto('/iframe.html?id=mushroom-edibilitybadge--all-sizes');
    await expect(page.locator('body')).toContainText('JADALNY');
    await expect(page.locator('body')).toContainText('ŚMIERTELNIE TRUJĄCY');
  });

  test('LookAlikeAlert renders fatal warning for Czubajka Kania vs Muchomor', async ({ page }) => {
    await page.goto('/iframe.html?id=mushroom-lookalikealert--deadly-confusion-kania-vs-muchomor');
    await expect(page.locator('body')).toContainText('ŚMIERTELNIE GROŹNE SOBOWTÓRY!');
    await expect(page.locator('body')).toContainText('Muchomor sromotnikowy (zielonawy)');
    await expect(page.locator('body')).toContainText('ruchomy pierścień');
    await expect(page.locator('body')).toContainText('luźną pochwę');
  });

  test('LookAlikeAlert says look-alike information is incomplete when the list is empty', async ({ page }) => {
    await page.goto('/iframe.html?id=mushroom-lookalikealert--incomplete-look-alike-record');
    await expect(page.locator('body')).toContainText('Informacja o sobowtórach jest niepełna');
    await expect(page.locator('body')).toContainText('Pusta lista nie oznacza braku groźnych sobowtórów');
    await expect(page.locator('body')).not.toContainText('Brak niebezpiecznych sobowtórów');
  });

  test('SafetyDisclaimerModal renders Sanepid legal warning and 112 emergency', async ({ page }) => {
    await page.goto('/iframe.html?id=mushroom-safetydisclaimermodal--interactive-disclaimer');
    await expect(page.locator('body')).toContainText('NIGDY NIE SPOŻYWAJ GRZYBÓW');
    await expect(page.locator('body')).toContainText('Weryfikacja w Sanepidzie');
    await expect(page.locator('body')).toContainText('112');
  });

  test('ResultModal says an unknown fungus is not a species and not food', async ({ page }) => {
    await page.goto('/iframe.html?id=mushroom-resultmodal--unknown-mushroom');
    await expect(page.getByTestId('recognition-unknown-title')).toContainText('Nieznany grzyb');
    await expect(page.getByTestId('recognition-unknown-body')).toContainText(
      'To wygląda na grzyba, którego aplikacja nie zna. Nie zbieraj go ani nie jedz na podstawie skanu.',
    );
    await expect(page.getByTestId('recognition-unknown-deadly')).toContainText(
      'Ten grzyb może być śmiertelnie trujący.',
    );
    await expect(page.getByTestId('recognition-unknown-verify')).toContainText('Sanepid');
    await expect(page.locator('body')).not.toContainText('%');
    await expect(page.locator('body')).not.toContainText('Borowik');
    await expect(page.locator('body')).not.toContainText('JADALNY');
    await expect(page.getByTestId('candidate-rank-1')).toHaveCount(0);
  });

  test('ResultModal rejects a non-mushroom without naming a species', async ({ page }) => {
    await page.goto('/iframe.html?id=mushroom-resultmodal--not-a-mushroom');
    await expect(page.getByTestId('recognition-rejected-title')).toContainText('Nie rozpoznano grzyba');
    await expect(page.getByTestId('recognition-rejected-body')).toContainText('Gatunek nie został podany');
    await expect(page.locator('body')).toContainText('Sanepidzie');
    await expect(page.locator('body')).not.toContainText('%');
    await expect(page.locator('body')).not.toContainText('Borowik');
    await expect(page.locator('body')).not.toContainText('JADALNY');
  });

  test('ResultModal warns on a dangerous genus and does not give an edibility verdict', async ({ page }) => {
    await page.goto('/iframe.html?id=mushroom-resultmodal--dangerous-genus-warning');
    await expect(page.getByTestId('expert-verification-banner')).toContainText('Sanepidzie');
    await expect(page.getByTestId('dangerous-genus-warning')).toContainText('Amanita');
    await expect(page.getByTestId('low-confidence-warning')).toBeVisible();
    await expect(page.getByTestId('not-edibility-verdict')).toContainText('nie jest oceną jadalności');
    await expect(page.getByTestId('candidate-confidence-1')).toContainText('41.0%');
    await expect(page.locator('body')).toContainText('Amanita phalloides');
    await expect(page.locator('body')).not.toContainText('JADALNY');
    await expect(page.locator('body')).not.toContainText('ŚMIERTELNIE TRUJĄCY');
  });

  test('Journal keeps an unclear find without a map and opens a saved spot', async ({ page }) => {
    await page.goto('/iframe.html?id=mushroom-journalscreen--saved-finds');
    await expect(page.getByTestId('journal-title-sighting_unclear')).toContainText('Niepewny wynik');
    await expect(page.getByTestId('journal-no-location-sighting_unclear')).toContainText(
      'Brak zapisanej lokalizacji',
    );
    await expect(page.getByTestId('journal-open-map-sighting_unclear')).toHaveCount(0);
    await expect(page.getByTestId('journal-candidate-sighting_spot-1')).toContainText('57.4%');
    await expect(page.getByTestId('journal-not-edible-sighting_spot')).toContainText('nie jest oceną jadalności');
    await expect(page.getByTestId('journal-open-map-sighting_spot')).toContainText('Otwórz miejsce w mapach');
    await expect(page.locator('body')).not.toContainText('JADALNY');

    await page.getByTestId('journal-edit-notes-sighting_spot').click();
    await page.getByTestId('journal-notes-input').fill('pod dębami, 4 sztuki');
    await page.getByTestId('journal-notes-save').click();
    await expect(page.getByTestId('journal-notes-sighting_spot')).toContainText('pod dębami, 4 sztuki');
    await page.reload();
    await expect(page.getByTestId('journal-notes-sighting_spot')).toContainText('pod dębami, 4 sztuki');
    await expect(page.getByTestId('journal-title-sighting_unclear')).toContainText('Niepewny wynik');
  });

  test('ResultModal says recognition is unavailable and shows no species or confidence', async ({ page }) => {
    await page.goto('/iframe.html?id=mushroom-resultmodal--recognition-unavailable');
    await expect(page.getByTestId('recognition-unavailable-title')).toContainText('Rozpoznawanie niedostępne');
    await expect(page.getByTestId('recognition-unavailable-body')).toContainText(
      'Nie ma modelu, który odczytuje piksele zdjęcia.'
    );
    await expect(page.locator('body')).not.toContainText('TFLite');
    await expect(page.locator('body')).not.toContainText('Pewność AI');
    await expect(page.locator('body')).not.toContainText('Borowik');
    await expect(page.locator('body')).not.toContainText('%');
  });

  test('Species detail keeps the olszówka warning without a kitchen section', async ({ page }) => {
    await page.goto('/iframe.html?id=mushroom-speciesdetailscreen--paxillus-incomplete-look-alikes');
    await expect(page.getByTestId('species-warning-notes')).toContainText('NIGDY NIE ZBIERAJ OLSZÓWEK');
    await expect(page.getByTestId('lookalike-link-lactarius_deliciosus')).toBeVisible();
    await expect(page.locator('body')).not.toContainText('Brak niebezpiecznych sobowtórów');
    await expect(page.getByTestId('fatal-lookalike-banner')).toContainText('Śmiertelnie groźny sobowtór');
    await expect(page.locator('body')).toContainText('ŚMIERTELNIE GROŹNE SOBOWTÓRY!');
    await expect(page.getByTestId('species-use-toxic')).toContainText('Toksyczność i objawy');
    await expect(page.locator('body')).not.toContainText('W kuchni');
  });

  test('Muchomor sromotnikowy keeps a red look-alike warning when the named twins are edible', async ({ page }) => {
    await page.goto('/iframe.html?id=mushroom-speciesdetailscreen--death-cap-red-warning');
    await expect(page.getByTestId('fatal-lookalike-banner')).toContainText('Śmiertelnie groźny sobowtór');
    await expect(page.locator('body')).toContainText('ŚMIERTELNIE GROŹNE SOBOWTÓRY!');
    await expect(page.getByTestId('lookalike-status-macrolepiota_procera')).toContainText('JADALNY');
    await expect(page.getByTestId('incomplete-card-badge-russula_virescens')).toContainText('KARTA NIEPEŁNA');
  });

  test('Panther card separates twardawy by ring and bulb and does not badge it as edible', async ({ page }) => {
    await page.goto('/iframe.html?id=mushroom-speciesdetailscreen--panther-missing-card-twins');
    await expect(page.locator('body')).toContainText('f. abietum');
    await expect(page.locator('body')).toContainText('w górach, pod jodłami i świerkami');
    await expect(page.locator('body')).toContainText('pierścień gładki');
    await expect(page.locator('body')).toContainText('pierścień prążkowany');
    await expect(page.getByTestId('lookalike-status-amanita_excelsa')).toContainText('NIEJADALNY');
    await expect(page.getByTestId('lookalike-status-amanita_excelsa')).not.toContainText(/\bJADALNY\b/);
    await expect(page.getByTestId('lookalike-status-amanita_excelsa')).not.toContainText('Brak karty');
    await expect(page.getByTestId('incomplete-card-badge-amanita_rubescens')).toContainText('KARTA NIEPEŁNA');
    await expect(page.getByTestId('lookalike-status-amanita_rubescens')).not.toContainText('JADALNY');
    await expect(page.getByTestId('lookalike-status-macrolepiota_procera')).toContainText('JADALNY');
    await expect(page.getByTestId('species-warning-notes')).toContainText('112 lub 999');
    await expect(page.getByTestId('species-warning-notes')).toContainText(
      'nie podaje się mleka ani alkoholu',
    );
    await expect(page.getByTestId('species-warning-notes')).toContainText('drgawki');
    await expect(page.locator('body')).not.toContainText('psylocybin');
    await expect(page.locator('body')).not.toContainText('607 218 174');
  });

  test('Fly agaric card lists poisoning symptoms and GIS first aid', async ({ page }) => {
    await page.goto('/iframe.html?id=mushroom-speciesdetailscreen--fly-agaric-poisoning-note');
    await expect(page.getByTestId('species-warning-notes')).toContainText('112 lub 999');
    await expect(page.getByTestId('species-warning-notes')).toContainText('po 0,5–2 godz.');
    await expect(page.getByTestId('species-warning-notes')).toContainText(
      'nie podaje się mleka ani alkoholu',
    );
    await expect(page.locator('body')).not.toContainText('psylocybin');
    await expect(page.locator('body')).not.toContainText('607 218 174');
  });

  test('Funeral bell warns that it is deadly and easy to confuse with Psilocybe', async ({ page }) => {
    await page.goto('/iframe.html?id=mushroom-speciesdetailscreen--funeral-bell-lookalikes');
    await expect(page.getByTestId('species-warning-notes')).toContainText(
      'Hełmówka jadowita jest śmiertelnie trująca i łatwo pomylić ją z łysiczką',
    );
    await expect(page.getByTestId('lookalike-unlinked-psilocybe')).toContainText(
      'Atlas nie wydaje werdyktu dla tego gatunku',
    );
    await expect(page.getByTestId('lookalike-unlinked-panaeolus')).toHaveCount(0);
    await expect(page.locator('body')).toContainText('Stamets 1996, s. 31–33, 144–145, 192–193');
    await expect(page.locator('body')).not.toContainText('Stamets 1996, s. 67–68');
    await expect(page.locator('body')).not.toContainText('Panaeolus');
    await expect(page.locator('body')).not.toContainText('Kołpaczki');
    await expect(page.locator('body')).not.toContainText('psylocybin');
    await expect(page.locator('body')).not.toContainText('pastwisk');
  });

  test('Fibrecap names majówka on an unfinished card without a green edible badge', async ({ page }) => {
    await page.goto('/iframe.html?id=mushroom-speciesdetailscreen--fibrecap-no-atlas-verdict');
    await expect(page.getByTestId('fatal-lookalike-banner')).toContainText('Śmiertelnie groźny sobowtór');
    await expect(page.getByTestId('incomplete-card-badge-calocybe_gambosa')).toContainText('KARTA NIEPEŁNA');
    await expect(page.getByTestId('lookalike-status-calocybe_gambosa')).not.toContainText('JADALNY');
    await expect(page.getByTestId('lookalike-status-calocybe_gambosa')).not.toContainText('Brak karty');
    await expect(page.getByTestId('lookalike-status-cantharellus_cibarius')).toContainText('JADALNY');
  });

  test('Species detail shows a fatal look-alike banner and warning notes for kania', async ({ page }) => {
    await page.goto('/iframe.html?id=mushroom-speciesdetailscreen--kania-fatal-look-alike');
    await expect(page.getByTestId('fatal-lookalike-banner')).toContainText('Śmiertelnie groźny sobowtór');
    await expect(page.getByTestId('species-warning-notes')).toContainText('muchomorami');
    await expect(page.locator('body')).toContainText('ŚMIERTELNIE GROŹNE SOBOWTÓRY!');
  });

  test('Smardz card states the 2014 partial-protection places without a green edible badge', async ({ page }) => {
    await page.goto('/iframe.html?id=mushroom-speciesdetailscreen--morel-protection-note');
    await expect(page.getByTestId('incomplete-card-badge')).toContainText('KARTA NIEPEŁNA');
    await expect(page.locator('body')).not.toContainText('JADALNY');
    await expect(page.getByTestId('species-use-neutral')).toContainText('Znaczenie w literaturze');
    await expect(page.locator('body')).not.toContainText('W kuchni');
    await expect(page.getByTestId('species-warning-notes')).toContainText(
      'poza terenem ogrodów, upraw ogrodniczych, szkółek leśnych oraz poza terenami zieleni'
    );
    await expect(page.getByTestId('species-warning-notes')).toContainText('§ 6 ust. 2 pkt 4');
    await expect(page.getByTestId('morel-protection-notice')).toContainText('Nie zbieraj dziko rosnących');
    await expect(page.getByTestId('morel-protection-notice')).toContainText('Dz.U. 2014 poz. 1408');
    await expect(page.getByTestId('morel-protection-notice')).toContainText('zezwoleniem');
  });

  test('Gołąbek zielonawy has no borrowed photo and a do-not-eat warning', async ({ page }) => {
    await page.goto('/iframe.html?id=mushroom-speciesdetailscreen--russula-without-photo');
    await expect(page.getByTestId('species-photo-missing')).toContainText('Brak zdjęcia');
    await expect(page.getByTestId('species-photo')).toHaveCount(0);
    await expect(page.getByTestId('species-warning-notes')).toContainText('NIE JEDZ NA PODSTAWIE TEJ KARTY');
    await expect(page.getByTestId('fatal-lookalike-banner')).toBeVisible();
    await expect(page.getByTestId('incomplete-card-banner')).toContainText('Karta niepełna');
    await expect(page.getByTestId('incomplete-card-badge')).toContainText('KARTA NIEPEŁNA');
    await expect(page.locator('body')).not.toContainText('JADALNY');
    await expect(page.getByTestId('species-use-neutral')).toContainText('Znaczenie w literaturze');
    await expect(page.locator('body')).not.toContainText('W kuchni');
  });

  test('Czubajnik czerwieniejący does not get the green kitchen section', async ({ page }) => {
    await page.goto('/iframe.html?id=mushroom-speciesdetailscreen--czubajnik-not-for-the-kitchen');
    await expect(page.getByTestId('species-use-toxic')).toContainText('Toksyczność i objawy');
    await expect(page.locator('body')).toContainText('TRUJĄCY');
    await expect(page.locator('body')).not.toContainText('NIEJADALNY');
    await expect(page.locator('body')).not.toContainText('W kuchni');
    await expect(page.getByTestId('species-use-edible')).toHaveCount(0);
  });

  test('Atlas scope matches the card list and filters combine to an empty state', async ({ page }) => {
    await page.goto('/iframe.html?id=mushroom-atlasscreen--filters');
    await expect(page.getByTestId('atlas-scope-notice')).toContainText('nie jest kompletny klucz');
    await expect(page.getByTestId('atlas-scope-notice')).toContainText('Sanepidzie');

    const search = page.getByPlaceholder('Szukaj grzyba (np. borowik, kania, kurka)...');
    await search.fill('zolciowy');
    await expect(page.getByText('Goryczak żółciowy')).toBeVisible();
    await expect(page.getByTestId('atlas-result-count')).toContainText('Pasujące karty: 1');
    await search.fill('');

    await page.getByTestId('filter-chip-kind-edible').click();
    await expect(page.getByTestId('atlas-matches').getByText('Prawdziwki')).toBeVisible();
    await expect(page.getByTestId('atlas-matches').getByText('☠ Sobowtór!').first()).toBeVisible();
    await expect(page.getByTestId('atlas-matches').getByText('Opieńki')).toHaveCount(0);
    await expect(page.getByTestId('atlas-matches').getByText('Gołąbek zielonawy')).toHaveCount(0);
    await expect(page.getByTestId('atlas-unverified').getByText('Opieńki')).toBeVisible();
    await expect(page.getByTestId('atlas-unverified').getByText('Gołąbek zielonawy')).toBeVisible();

    await page.getByTestId('filter-chip-kind-poisonous').click();
    await expect(page.getByTestId('atlas-matches').getByText('Prawdziwki')).toBeVisible();
    await expect(page.getByTestId('atlas-matches').getByText('Muchomor sromotnikowy (zielonawy)')).toBeVisible();
    await expect(page.getByTestId('atlas-matches').getByText('Krowiak podwinięty (Olszówka)')).toBeVisible();
    await expect(page.getByTestId('atlas-card-badge-paxillus_involutus')).toContainText('ŚMIERTELNIE TRUJĄCY');
    await expect(page.getByTestId('atlas-psychoactive-amanita_muscaria')).toBeVisible();

    await page.getByTestId('filter-chip-kind-edible').click();
    await page.getByTestId('filter-chip-kind-poisonous').click();
    await page.getByTestId('atlas-filter-open').click();
    await page.getByTestId('filter-chip-hymenophore-kolce').click();
    await page.getByTestId('atlas-filter-show').click();
    await expect(page.getByTestId('atlas-matches').getByText('Kolczak obłączasty')).toBeVisible();
    await expect(page.getByTestId('atlas-result-count')).toContainText('Pasujące karty: 1');
    await expect(page.getByTestId('atlas-unverified').getByText('Zasłonak rudawy')).toBeVisible();
    await expect(page.getByTestId('atlas-unverified')).toContainText(
      'Są tu też gatunki trujące i śmiertelnie trujące, których nie da się wykluczyć na podstawie tych cech',
    );

    await page.getByPlaceholder('Szukaj grzyba (np. borowik, kania, kurka)...').fill('brak-takiego-grzyba');
    await expect(page.getByTestId('atlas-empty')).toContainText('Brak karty nie oznacza, że grzyb jest jadalny');
    await expect(page.getByTestId('atlas-result-count')).toContainText('Pasujące karty: 0');
  });

  test('A finished edible species keeps the green kitchen section', async ({ page }) => {
    await page.goto('/iframe.html?id=mushroom-speciesdetailscreen--kania-fatal-look-alike');
    await expect(page.getByTestId('species-use-edible')).toContainText('W kuchni');
    await expect(page.getByTestId('species-use-neutral')).toHaveCount(0);
  });

  test('Safety guide takes mushrooms whole and cuts only sure tube mushrooms', async ({ page }) => {
    await page.goto('/iframe.html?id=mushroom-safetyguidescreen--golden-rules');
    await expect(page.locator('body')).toContainText(
      'Dla początkujących: tylko grzyby z rurkami (z "gąbką")',
    );
    await expect(page.locator('body')).toContainText(
      'Wyjmuj grzyby w całości, z bulwą i pochwą u nasady',
    );
    await expect(page.locator('body')).toContainText('bez rurek');
    await expect(page.locator('body')).toContainText('Takich grzybów nie ucinaj nad ziemią');
    await expect(page.locator('body')).toContainText(
      'Tylko grzyby rurkowe (z „gąbką”) możesz ścinać nisko nożem',
    );
    await expect(page.locator('body')).toContainText('Grzybów z blaszkami nie ścinaj');
    await expect(page.locator('body')).toContainText('grzyboznawcy');
    await expect(page.locator('body')).toContainText('dziko rosnących smardzów');
    await expect(page.locator('body')).not.toContainText('resztki pierścienia');
    await expect(page.locator('body')).not.toContainText('bezpodstawny');
  });

  test('PreparationGuide renders cleaning, cooking, and storing categories', async ({ page }) => {
    await page.goto('/iframe.html?id=mushroom-preparationguidescreen--default-view');
    await expect(page.locator('body')).toContainText('Poradnik Przygotowania');
    await expect(page.locator('body')).toContainText('Czyszczenie na sucho');
    await expect(page.locator('body')).toContainText('Obróbka cieplna');
    await expect(page.locator('body')).toContainText('Przechowywanie świeżych grzybów');
  });
});
