import { CameraView, useCameraPermissions } from 'expo-camera';
import { launchImageLibraryAsync } from 'expo-image-picker';
import { router } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getSpeciesDetail } from '@/core/db/species-search';
import { messagesFor } from '@/core/i18n';
import { getSpeciesDb } from '@/infra/db/species-db';
import { useSettings } from '@/infra/settings/use-settings-store';
import { ThemeFrame } from '@/screens/theme-frame';
import { EdibilityBadge } from '@/ui/badge';
import { LatinBinomial } from '@/ui/latin-binomial';
import { PileusButton } from '@/ui/pileus-button';
import { ReticleGuide, type ScannerStep } from '@/ui/reticle-guide';
import { Surface } from '@/ui/surface';
import { AppText } from '@/ui/text';
import { themes, touchTargetMinDp } from '@/ui/tokens';

const DEMO_HYPOTHESIS_ID = 'macrolepiota_procera';
const DEMO_CONFIDENCE = 96;

export function ScannerScreen() {
  const insets = useSafeAreaInsets();
  const theme = useSettings((state) => state.theme);
  const englishEnabled = useSettings((state) => state.englishEnabled);
  const messages = messagesFor(englishEnabled);
  const locale = englishEnabled ? 'en' : 'pl';
  const colors = themes[theme];
  const isHc = theme === 'highContrast';

  const [permission, requestPermission] = useCameraPermissions();
  const [activeStep, setActiveStep] = useState<ScannerStep>(1);
  const [slots, setSlots] = useState<[string | null, string | null, string | null]>([
    null,
    null,
    null,
  ]);
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [isTriageOpen, setIsTriageOpen] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isPicking, setIsPicking] = useState(false);

  const isCapturingRef = useRef(false);
  const isPickingRef = useRef(false);
  const cameraRef = useRef<CameraView>(null);

  const db = getSpeciesDb();

  const candidateDetail = useMemo(() => {
    try {
      return getSpeciesDetail(db, DEMO_HYPOTHESIS_ID, locale);
    } catch {
      return null;
    }
  }, [db, locale]);

  const candidateSpecies = useMemo(() => {
    const defaultFatalLookAlike = {
      id: 'macrolepiota_procera__amanita_phalloides__0',
      lookalikeName: messages.scanner.demoLookalikeName,
      lookalikeLatin: 'Amanita phalloides',
    };

    const defaultTraits = [
      messages.scanner.traitMovableRing,
      messages.scanner.traitSnakeskinStipe,
      messages.scanner.traitNoVolva,
      messages.scanner.traitWhiteGills,
    ];

    if (!candidateDetail) {
      return {
        id: DEMO_HYPOTHESIS_ID,
        name: messages.scanner.demoSpeciesName,
        latinName: 'Macrolepiota procera',
        edibility: 'EDIBLE' as const,
        fatalLookAlike: defaultFatalLookAlike,
        traits: defaultTraits,
      };
    }

    const fatalMatch = candidateDetail.lookAlikes.find((l) => l.fatal);
    const fatalLookAlike = fatalMatch
      ? {
          id: fatalMatch.id,
          lookalikeName: fatalMatch.lookalikeName || messages.scanner.demoLookalikeName,
          lookalikeLatin: fatalMatch.lookalikeLatin,
        }
      : defaultFatalLookAlike;

    return {
      id: candidateDetail.id,
      name: candidateDetail.name,
      latinName: candidateDetail.latinName,
      edibility: candidateDetail.edibility,
      fatalLookAlike,
      traits: defaultTraits,
    };
  }, [candidateDetail, messages.scanner]);

  const edibilityLabels: Record<string, string> = {
    EDIBLE: messages.atlas.edibilityEdible,
    CONDITIONALLY_EDIBLE: messages.atlas.edibilityConditionally,
    INEDIBLE: messages.atlas.edibilityInedible,
    POISONOUS: messages.atlas.edibilityPoisonous,
    DEADLY_POISONOUS: messages.atlas.edibilityDeadly,
  };

  const capturedCount = slots.filter((uri): uri is string => Boolean(uri)).length;

  const advanceToNextEmptySlot = useCallback(
    (current: ScannerStep, nextSlots: [string | null, string | null, string | null]) => {
      if (current === 1 && !nextSlots[1]) {
        setActiveStep(2);
      } else if (current === 2 && !nextSlots[2]) {
        setActiveStep(3);
      } else if (!nextSlots[0]) {
        setActiveStep(1);
      } else if (!nextSlots[1]) {
        setActiveStep(2);
      } else if (!nextSlots[2]) {
        setActiveStep(3);
      }
    },
    [],
  );

  const handleCapture = async () => {
    if (!cameraRef.current || isCapturingRef.current) return;
    isCapturingRef.current = true;
    setIsCapturing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.8 });
      if (photo?.uri) {
        const nextSlots = [...slots] as [string | null, string | null, string | null];
        nextSlots[activeStep - 1] = photo.uri;
        setSlots(nextSlots);
        advanceToNextEmptySlot(activeStep, nextSlots);
      }
    } catch {
      // Ignoruj błąd sprzętu aparatu
    } finally {
      isCapturingRef.current = false;
      setIsCapturing(false);
    }
  };

  const handlePickFromGallery = async () => {
    if (isPickingRef.current) return;
    isPickingRef.current = true;
    setIsPicking(true);
    try {
      const result = await launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0 && result.assets[0]?.uri) {
        const uri = result.assets[0].uri;
        const nextSlots = [...slots] as [string | null, string | null, string | null];
        nextSlots[activeStep - 1] = uri;
        setSlots(nextSlots);
        advanceToNextEmptySlot(activeStep, nextSlots);
      }
    } catch {
      // Ignoruj błąd otwarcia galerii
    } finally {
      isPickingRef.current = false;
      setIsPicking(false);
    }
  };

  const handleClearSlot = (index: number) => {
    const nextSlots = [...slots] as [string | null, string | null, string | null];
    nextSlots[index] = null;
    setSlots(nextSlots);
    setActiveStep((index + 1) as ScannerStep);
  };

  const handleReset = () => {
    setSlots([null, null, null]);
    setActiveStep(1);
    setIsTriageOpen(false);
  };

  const stepLabels = [
    {
      title: messages.scanner.guideCapTitle,
      sub: messages.scanner.guideCapSubtitle,
      short: messages.scanner.stepCap,
    },
    {
      title: messages.scanner.guideGillsTitle,
      sub: messages.scanner.guideGillsSubtitle,
      short: messages.scanner.stepGills,
    },
    {
      title: messages.scanner.guideStemTitle,
      sub: messages.scanner.guideStemSubtitle,
      short: messages.scanner.stepStem,
    },
  ];

  if (!permission) {
    return (
      <ThemeFrame>
        <View
          testID="scanner-screen"
          className="flex-1 items-center justify-center"
          style={{ backgroundColor: colors.paper }}
        >
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      </ThemeFrame>
    );
  }

  if (!permission.granted) {
    return (
      <ThemeFrame>
        <View
          testID="scanner-screen"
          className="flex-1 items-center justify-center px-6"
          style={{ backgroundColor: colors.paper }}
        >
          <AppText className="text-4xl mb-4">📷</AppText>
          <AppText emphasis className="text-xl text-center mb-2" style={{ color: colors.ink }}>
            {messages.scanner.permissionRequired}
          </AppText>
          <AppText className="text-sm text-center mb-6" style={{ color: colors.muted }}>
            {messages.scanner.permissionExplanation}
          </AppText>
          <View className="w-full gap-3">
            <PileusButton
              label={messages.scanner.grantPermission}
              variant="primary"
              theme={theme}
              onPress={requestPermission}
            />
            <PileusButton
              label={messages.scanner.pickFromGalleryFallback}
              variant="secondary"
              theme={theme}
              onPress={handlePickFromGallery}
            />
          </View>
        </View>
      </ThemeFrame>
    );
  }

  const currentStepInfo = stepLabels[activeStep - 1] ?? stepLabels[0];

  return (
    <ThemeFrame>
      <View testID="scanner-screen" className="flex-1" style={{ backgroundColor: '#000000' }}>
        {/* Wizjer z kamerą */}
        <View className="flex-1 relative overflow-hidden">
          <CameraView
            ref={cameraRef}
            testID="camera-view"
            style={StyleSheet.absoluteFill}
            facing="back"
            enableTorch={isTorchOn}
          />

          {/* Górny pasek HUD kamery: TYLKO przycisk Doświetl */}
          <View
            testID="top-camera-hud"
            className="absolute top-0 left-0 right-0 pb-3 px-4 flex-row items-center justify-end"
            style={{
              paddingTop: Math.max(insets.top, 16) + 4,
              backgroundColor: 'rgba(0, 0, 0, 0.4)',
            }}
          >
            <Pressable
              testID="torch-toggle-button"
              accessibilityRole="button"
              accessibilityLabel={isTorchOn ? messages.scanner.torchOn : messages.scanner.torchOff}
              onPress={() => setIsTorchOn((prev) => !prev)}
              className="flex-row items-center px-3.5 py-2 rounded-full"
              style={{
                backgroundColor: isTorchOn ? '#FEF08A' : 'rgba(0, 0, 0, 0.6)',
                borderWidth: isHc ? 2 : 1.5,
                borderColor: isTorchOn ? '#EAB308' : 'rgba(255, 255, 255, 0.4)',
                minHeight: touchTargetMinDp,
                minWidth: touchTargetMinDp,
              }}
            >
              <AppText className="text-base mr-1.5">{isTorchOn ? '🔦' : '💡'}</AppText>
              <AppText
                emphasis
                className="text-xs"
                style={{ color: isTorchOn ? '#713F12' : '#FFFFFF' }}
              >
                {isTorchOn ? messages.scanner.torchOn : messages.scanner.torchOff}
              </AppText>
            </Pressable>
          </View>

          {/* Dynamiczny celownik SVG */}
          <View className="flex-1 items-center justify-center">
            <ReticleGuide
              step={activeStep}
              theme={theme}
              size={270}
              accessibilityLabel={messages.scanner.reticleGuideA11y.replace(
                '{step}',
                String(activeStep),
              )}
            />
          </View>

          {/* Etykieta bieżącego kąta w wizjerze */}
          <View className="absolute bottom-3 left-4 right-4 items-center">
            <View
              className="px-4 py-2 rounded-xl items-center"
              style={{ backgroundColor: 'rgba(0, 0, 0, 0.65)' }}
            >
              <AppText emphasis className="text-xs text-white">
                {currentStepInfo?.title}
              </AppText>
              <AppText className="text-[11px] text-gray-200 mt-0.5 text-center">
                {currentStepInfo?.sub}
              </AppText>
            </View>
          </View>
        </View>

        {/* 3-slotowa tacka ujęć (Warm Paper theme) */}
        <View
          testID="multi-shot-tray"
          className="px-4 py-3 border-t"
          style={{
            backgroundColor: colors.paper,
            borderColor: colors.border,
          }}
        >
          <View className="flex-row items-center justify-between mb-2">
            <AppText
              emphasis
              className="text-xs uppercase tracking-wider"
              style={{ color: colors.muted }}
            >
              {messages.scanner.trayTitle}
            </AppText>
            {capturedCount > 0 && (
              <Pressable
                testID="reset-slots-button"
                accessibilityRole="button"
                accessibilityLabel={messages.scanner.reset}
                onPress={handleReset}
                hitSlop={12}
              >
                <AppText className="text-xs font-semibold" style={{ color: colors.danger }}>
                  {messages.scanner.reset}
                </AppText>
              </Pressable>
            )}
          </View>

          <View className="flex-row items-center justify-between gap-3">
            {slots.map((uri, index) => {
              const stepNum = (index + 1) as ScannerStep;
              const isActive = activeStep === stepNum;
              const stepLabel = stepLabels[index]?.short ?? '';
              const statusText = uri ? messages.scanner.slotCaptured : messages.scanner.slotEmpty;

              return (
                <Pressable
                  key={index}
                  testID={`slot-${index}`}
                  accessibilityRole="button"
                  accessibilityLabel={`${stepLabel} - ${statusText}`}
                  onPress={() => setActiveStep(stepNum)}
                  className="flex-1 rounded-xl p-2 items-center justify-center relative overflow-hidden"
                  style={{
                    height: 72,
                    minHeight: touchTargetMinDp,
                    backgroundColor: colors.surface,
                    borderWidth: isActive ? 2.5 : isHc ? 1.5 : 1,
                    borderColor: isActive
                      ? colors.accent
                      : uri
                        ? colors.borderStrong
                        : colors.border,
                  }}
                >
                  {uri ? (
                    <>
                      <Image
                        source={{ uri }}
                        className="w-full h-full rounded-lg"
                        resizeMode="cover"
                      />
                      <View className="absolute top-1 right-1 bg-green-700 rounded-full w-5 h-5 items-center justify-center">
                        <AppText className="text-white text-[10px] font-bold">✓</AppText>
                      </View>
                      <Pressable
                        testID={`clear-slot-${index}`}
                        accessibilityRole="button"
                        accessibilityLabel={messages.scanner.clearSlot.replace('{step}', stepLabel)}
                        hitSlop={14}
                        onPress={(e) => {
                          e.stopPropagation();
                          handleClearSlot(index);
                        }}
                        className="absolute bottom-1 right-1 bg-black/60 rounded-full w-5 h-5 items-center justify-center"
                      >
                        <AppText className="text-white text-[10px]">✕</AppText>
                      </Pressable>
                    </>
                  ) : (
                    <View className="items-center justify-center">
                      <AppText className="text-base mb-0.5">
                        {index === 0 ? '🍄' : index === 1 ? '🔍' : '📏'}
                      </AppText>
                      <AppText
                        emphasis
                        className="text-[10px]"
                        style={{ color: isActive ? colors.accent : colors.muted }}
                      >
                        {stepLabel}
                      </AppText>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Dolny pasek kontroli aparatu: Galeria | Spust migawki | Analizuj */}
        <View
          testID="camera-controls-bar"
          className="flex-row items-center justify-between px-6 py-4 border-t"
          style={{
            backgroundColor: colors.paper,
            borderColor: colors.border,
            minHeight: 88,
          }}
        >
          {/* Przycisk Galeria */}
          <Pressable
            testID="gallery-button"
            accessibilityRole="button"
            accessibilityLabel={messages.scanner.gallery}
            disabled={isPicking}
            onPress={handlePickFromGallery}
            className="items-center justify-center p-2 rounded-xl"
            style={{
              minHeight: touchTargetMinDp,
              minWidth: touchTargetMinDp,
              opacity: isPicking ? 0.5 : 1,
            }}
          >
            <AppText className="text-2xl">🖼️</AppText>
            <AppText className="text-[11px] mt-1 font-semibold" style={{ color: colors.ink }}>
              {messages.scanner.gallery}
            </AppText>
          </Pressable>

          {/* Centralny spust migawki ze wskaźnikiem KROK X/3 */}
          <View className="items-center">
            <Pressable
              testID="shutter-button"
              accessibilityRole="button"
              accessibilityLabel={messages.scanner.shutter}
              disabled={isCapturing}
              onPress={handleCapture}
              className="rounded-full items-center justify-center"
              style={{
                width: 72,
                height: 72,
                minHeight: touchTargetMinDp,
                minWidth: touchTargetMinDp,
                backgroundColor: colors.paper,
                borderWidth: 4,
                borderColor: colors.accent,
                opacity: isCapturing ? 0.6 : 1,
              }}
            >
              <View
                className="rounded-full items-center justify-center"
                style={{
                  width: 58,
                  height: 58,
                  backgroundColor: colors.accent,
                }}
              >
                <AppText className="text-white text-xl">📷</AppText>
              </View>
            </Pressable>
            <AppText
              emphasis
              className="text-[10px] uppercase tracking-wider mt-1.5"
              style={{ color: colors.muted }}
            >
              {messages.scanner.stepIndicator.replace('{current}', String(activeStep))}
            </AppText>
          </View>

          {/* Przycisk Analizuj z licznikiem ujęć */}
          <Pressable
            testID="analyze-button"
            accessibilityRole="button"
            accessibilityLabel={`${messages.scanner.analyze} (${capturedCount}/3)`}
            disabled={capturedCount === 0}
            onPress={() => setIsTriageOpen(true)}
            className="items-center justify-center p-2 rounded-xl relative"
            style={{
              minHeight: touchTargetMinDp,
              minWidth: touchTargetMinDp,
              opacity: capturedCount === 0 ? 0.35 : 1,
            }}
          >
            <View className="relative">
              <AppText className="text-2xl">⚡</AppText>
              <View
                className="absolute -top-1 -right-3 rounded-full px-1.5 py-0.2"
                style={{
                  backgroundColor: capturedCount > 0 ? colors.accent : colors.muted,
                }}
              >
                <AppText className="text-[9px] font-bold text-white">{capturedCount}/3</AppText>
              </View>
            </View>
            <AppText emphasis className="text-[11px] mt-1" style={{ color: colors.ink }}>
              {messages.scanner.analyze}
            </AppText>
          </Pressable>
        </View>

        {/* Ekran 04: Triage Diagnostyczny Modal */}
        <Modal
          testID="triage-modal"
          animationType="slide"
          visible={isTriageOpen}
          onRequestClose={() => setIsTriageOpen(false)}
        >
          <ThemeFrame>
            <View className="flex-1" style={{ backgroundColor: colors.paper }}>
              {/* Nagłówek modala */}
              <View
                className="flex-row items-center justify-between px-5 pb-3 border-b"
                style={{
                  paddingTop: Math.max(insets.top, 16) + 4,
                  borderColor: colors.border,
                }}
              >
                <AppText emphasis className="text-lg" style={{ color: colors.ink }}>
                  {messages.scanner.triageTitle}
                </AppText>
                <Pressable
                  testID="close-triage-button"
                  accessibilityRole="button"
                  accessibilityLabel={messages.scanner.closeTriage}
                  onPress={() => setIsTriageOpen(false)}
                  className="p-2 rounded-full items-center justify-center"
                  style={{ minWidth: touchTargetMinDp, minHeight: touchTargetMinDp }}
                >
                  <AppText className="text-lg font-bold" style={{ color: colors.ink }}>
                    ✕
                  </AppText>
                </Pressable>
              </View>

              <ScrollView
                className="flex-1 px-5 py-4"
                contentContainerStyle={{ paddingBottom: 40 }}
              >
                {/* Rząd miniaturek wykonanych ujęć */}
                <AppText
                  emphasis
                  className="text-xs uppercase tracking-wider mb-2"
                  style={{ color: colors.muted }}
                >
                  {messages.scanner.capturedAngles}
                </AppText>
                <View className="flex-row gap-2.5 mb-5">
                  {slots.map((uri, idx) => (
                    <View
                      key={idx}
                      className="flex-1 h-20 rounded-xl overflow-hidden items-center justify-center border"
                      style={{
                        backgroundColor: colors.surface,
                        borderColor: colors.border,
                      }}
                    >
                      {uri ? (
                        <Image source={{ uri }} className="w-full h-full" resizeMode="cover" />
                      ) : (
                        <AppText className="text-xs" style={{ color: colors.muted }}>
                          {stepLabels[idx]?.short}
                        </AppText>
                      )}
                    </View>
                  ))}
                </View>

                {/* Karta głównej hipotezy */}
                <Surface testID="candidate-card" level={1} theme={theme} className="p-4 mb-4">
                  <View className="flex-row items-center justify-between mb-2">
                    <AppText
                      emphasis
                      className="text-[11px] uppercase tracking-wider"
                      style={{ color: colors.muted }}
                    >
                      {messages.scanner.hypothesisLabel}
                    </AppText>
                    <View className="bg-emerald-100 rounded-full px-2.5 py-0.5">
                      <AppText emphasis className="text-xs text-emerald-800">
                        {messages.scanner.confidenceMatch.replace(
                          '{confidence}',
                          String(DEMO_CONFIDENCE),
                        )}
                      </AppText>
                    </View>
                  </View>

                  <AppText emphasis className="text-2xl mb-1" style={{ color: colors.ink }}>
                    {candidateSpecies.name}
                  </AppText>
                  <LatinBinomial name={candidateSpecies.latinName} className="mb-3" />

                  <View className="flex-row items-center mb-3">
                    <EdibilityBadge
                      status={candidateSpecies.edibility}
                      label={
                        candidateSpecies.edibility
                          ? (edibilityLabels[candidateSpecies.edibility] ??
                            candidateSpecies.edibility)
                          : ''
                      }
                      theme={theme}
                    />
                  </View>

                  <AppText emphasis className="text-xs mb-2" style={{ color: colors.ink }}>
                    {messages.scanner.morphologyTraits}:
                  </AppText>
                  <View className="flex-row flex-wrap gap-1.5">
                    {candidateSpecies.traits.map((trait, tIdx) => (
                      <View
                        key={tIdx}
                        className="rounded-full px-3 py-1 border"
                        style={{
                          backgroundColor: colors.surfaceRaised,
                          borderColor: colors.border,
                        }}
                      >
                        <AppText className="text-xs" style={{ color: colors.ink }}>
                          {trait}
                        </AppText>
                      </View>
                    ))}
                  </View>
                </Surface>

                {/* Karmazynowy baner ostrzeżenia śmiertelnego (Life-safety banner #AD1414) */}
                {candidateSpecies.fatalLookAlike && (
                  <View
                    testID="deadly-risk-banner"
                    className="p-4 rounded-xl mb-5"
                    style={{
                      backgroundColor: colors.danger,
                      borderWidth: 2,
                      borderColor: '#FF1744',
                    }}
                  >
                    <View className="flex-row items-center gap-2 mb-2">
                      <AppText className="text-2xl">☠️</AppText>
                      <AppText emphasis className="text-base text-white flex-1">
                        {messages.scanner.deadlyRiskTitle}
                      </AppText>
                    </View>

                    <AppText className="text-xs text-white mb-2 leading-relaxed">
                      {messages.scanner.deadlyRiskDescription
                        .replace('{lookalike}', candidateSpecies.fatalLookAlike.lookalikeName)
                        .replace('{latin}', candidateSpecies.fatalLookAlike.lookalikeLatin)}
                    </AppText>

                    <AppText className="text-[11px] text-white/90 mb-3 italic">
                      {messages.scanner.deadlyRiskDetail}
                    </AppText>

                    <Pressable
                      testID="compare-lookalike-button"
                      accessibilityRole="button"
                      accessibilityLabel={messages.scanner.compareLookAlikeCta}
                      onPress={() => {
                        setIsTriageOpen(false);
                        router.push(
                          `/look-alikes/${candidateSpecies.fatalLookAlike.id}` as Parameters<
                            typeof router.push
                          >[0],
                        );
                      }}
                      className="bg-white rounded-xl py-2.5 px-4 items-center justify-center flex-row gap-2"
                      style={{ minHeight: touchTargetMinDp }}
                    >
                      <AppText className="text-sm">⚖️</AppText>
                      <AppText emphasis className="text-sm text-red-900">
                        {messages.scanner.compareLookAlikeCta}
                      </AppText>
                    </Pressable>
                  </View>
                )}

                {/* Przyciski akcji */}
                <View className="gap-3 mb-6">
                  <PileusButton
                    testID="view-species-card-button"
                    label={messages.scanner.viewAtlasCardCta}
                    variant="primary"
                    theme={theme}
                    onPress={() => {
                      setIsTriageOpen(false);
                      router.push(
                        `/species/${candidateSpecies.id}` as Parameters<typeof router.push>[0],
                      );
                    }}
                  />

                  <PileusButton
                    testID="scan-again-button"
                    label={messages.scanner.scanAgainCta}
                    variant="secondary"
                    theme={theme}
                    onPress={handleReset}
                  />
                </View>

                {/* Zastrzeżenie bezpieczeństwa */}
                <AppText
                  className="text-[11px] text-center italic leading-relaxed"
                  style={{ color: colors.muted }}
                >
                  {messages.scanner.safetyDisclaimer}
                </AppText>
              </ScrollView>
            </View>
          </ThemeFrame>
        </Modal>
      </View>
    </ThemeFrame>
  );
}
