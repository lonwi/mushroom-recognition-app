export const en = {
  common: {
    appName: 'Grzybobranie AI',
    tagline:
      'On-device mushroom atlas and recognition. Works offline, no account required, no photos sent to the cloud.',
    previewBadge: 'Greenfield Preview',
    contactEmail: 'hello@astigmatic.dev',
    repoUrl: 'https://github.com/lonwi/mushroom-recognition-app',
    issuesUrl: 'https://github.com/lonwi/mushroom-recognition-app/issues',
    skipToContent: 'Skip to content',
    copyright: '© 2026 Grzybobranie AI. All rights reserved.',
  },
  nav: {
    home: 'Home',
    privacy: 'Privacy',
    dataDeletion: 'Data deletion',
    licenses: 'Licenses',
  },
  meta: {
    home: {
      title: 'Grzybobranie AI — Offline Mushroom Atlas & Recognition',
      description:
        'Grzybobranie AI: on-device mushroom classification and botanical field guide for Central Europe. Completely offline and privacy-first.',
    },
    privacy: {
      title: 'Privacy Policy — Grzybobranie AI',
      description:
        'Privacy Policy and Data Safety declaration for Grzybobranie AI. On-device processing, no accounts, no telemetry.',
    },
    dataDeletion: {
      title: 'Data Deletion — Grzybobranie AI',
      description:
        'Data deletion procedure and guidelines for Grzybobranie AI per Google Play requirements.',
    },
    licenses: {
      title: 'Licenses & Attributions — Grzybobranie AI',
      description:
        'Attributions for CC0 and CC BY photos, Apache-2.0 license for Keras base code, and copyright notices for Grzybobranie AI.',
    },
    notFound: {
      title: 'Page Not Found (404) — Grzybobranie AI',
      description: 'The requested page was not found.',
    },
  },
  safety: {
    title: 'Safety Warning',
    lead: 'This application does not replace a qualified mycologist or official mushroom inspector.',
    neverEat:
      'Never consume any wild mushroom solely based on suggestions from this application or any AI model. Algorithms can misclassify species due to lighting, age, specimen decay, or dirt.',
    poisonSuspected:
      'If mushroom poisoning is suspected, immediately seek emergency medical assistance or visit the nearest toxicology unit. Everyone who consumed the meal should seek medical attention, even if asymptomatic.',
    sanepidFree:
      'Free identification and inspection of collected mushrooms is provided by certified mycologists at state sanitary-epidemiological stations (Sanepid). When in doubt, leave the mushroom in the woods.',
    gisSourceLabel: 'Safety guidelines source:',
    gisSourceName: 'Chief Sanitary Inspectorate (GIS), „Bezpieczne grzybobranie”',
    gisSourceUrl: 'https://www.gov.pl/web/gis/bezpieczne-grzybobranie',
    noVerdictNotice:
      'The application suggests probable species names, but NEVER issues an edibility verdict. Edibility statuses come strictly from curated mycological references.',
  },
  home: {
    heroTitle: 'Grzybobranie AI',
    heroLead:
      'A field companion for foraging and identifying mushrooms in Poland and Central Europe. Runs entirely offline, requires no registration, and keeps your photos on your device.',
    statusNotice:
      'Under active development for Google Play (Android). Development and source code are maintained openly.',
    pillarsTitle: 'Three Core Pillars',
    scannerTitle: 'On-Device Recognition',
    scannerDesc:
      'Neural network inference runs locally on your smartphone via TensorFlow Lite. Photos never leave your phone. In development builds without a calibrated model, the app transparently reports: “recognition unavailable”.',
    atlasTitle: 'Species Field Atlas',
    atlasDesc:
      'Rich species cards with Polish, English, and scientific Latin binomials, morphological field keys (spores, cap, stem), seasonal fruiting calendars, and fatal look-alike comparisons.',
    helpTitle: 'Safety & Help Guidelines',
    helpDesc:
      'First-aid procedures, official guidelines from the Chief Sanitary Inspectorate, emergency contact guidance, and photo author attributions.',
    offlineFirstTitle: 'Privacy-First Architecture',
    offlineFirstDesc:
      'Forests rarely have reliable mobile connectivity. Grzybobranie AI packages all necessary databases and models directly inside the app installer. Zero telemetry, no user tracking, zero cloud dependencies.',
  },
  privacy: {
    title: 'Privacy Policy',
    effectiveDate: 'Effective date: November 18, 2026 (Version 1.0.0)',
    lead: 'This document explains data privacy practices for the Grzybobranie AI mobile application and this informational website, compliant with GDPR and Google Play Console standards.',
    adminTitle: 'Data Controller',
    adminDesc:
      'The application developer and data controller is Wojciech Bubolka. Contact for privacy matters: hello@astigmatic.dev.',
    dataCollectionTitle: 'No Personal Data Collection',
    dataCollectionDesc:
      'Grzybobranie AI follows a strict privacy-by-design architecture (Project Principle D-16):',
    dataCollectionPoints: [
      'No user accounts: No login, no email address, and no phone numbers are requested.',
      'No cloud backend: Photos taken with the camera or selected from the gallery are processed strictly in volatile device memory.',
      'No analytics or trackers: No Google Analytics, Firebase, Facebook SDK, or third-party tracking libraries.',
      'No cookies: This website is completely static and stores no cookies or tracking pixels.',
    ],
    permissionsTitle: 'Android App Permissions',
    permissionsDesc: 'The app requests only permissions necessary for its core functionality:',
    permissionCamera:
      'Camera (CAMERA): Allows taking a picture of a mushroom inside the Scanner module. The picture is evaluated locally and never uploaded.',
    permissionStorage:
      'Photos / Media (READ_MEDIA_IMAGES): Allows selecting a photo from device storage for local evaluation.',
    diagnosticsTitle: 'Local Diagnostic Log',
    diagnosticsDesc:
      'The app maintains a local diagnostic log buffer of limited size (maximum 256 KiB) saved solely in internal app storage for debugging. It contains no GPS coordinates and no photos. Exporting this log occurs ONLY upon explicit user action via the system share sheet in Settings. This is the only way data ever leaves the device.',
    dataSafetyTitle: 'Google Play Data Safety Declaration',
    dataSafetyLead:
      'The table below represents our official Data Safety declaration for Google Play:',
    dataSafetyTable: {
      category: 'Category',
      collected: 'Collected?',
      shared: 'Shared with 3rd parties?',
      purpose: 'Purpose',
      rowPersonal: 'Personal info (Name, email, phone, ID)',
      rowPhotos: 'Photos and videos',
      rowLocation: 'Location (Approximate or precise)',
      rowDiagnostics: 'Crash logs and diagnostics',
      no: 'NO',
      noSharing: 'NO',
      localOnly: 'Processed solely on-device (never uploaded)',
      optInShare: 'Optional manual user export for technical troubleshooting',
    },
    dataDeletionLinkText:
      'For details on removing data from your phone, see the Data deletion page.',
  },
  dataDeletion: {
    title: 'Data Deletion Guidelines',
    lead: 'User data deletion guidelines for Grzybobranie AI in compliance with Google Play store policies.',
    noRemoteDataTitle: 'No Data Stored on Remote Servers',
    noRemoteDataDesc:
      'Grzybobranie AI does not require accounts and operates with zero remote server storage. Therefore, no user data exists on external servers that would require remote deletion.',
    howToDeleteTitle: 'How to Delete All Data from Your Device',
    howToDeleteDesc:
      'All data generated by the app (theme preferences, settings, local diagnostic log) is stored strictly in private internal device storage. You can erase it at any time in two ways:',
    stepClearData:
      '1. Clear app storage: Open phone Settings → Apps → Grzybobranie AI → Storage & cache → Clear storage / Clear data.',
    stepUninstall:
      '2. Uninstall the app: Uninstalling Grzybobranie AI immediately and permanently erases all associated files and data from device storage.',
    contactQuestion: 'If you have any questions regarding privacy or data handling, contact us at:',
  },
  licenses: {
    title: 'Licenses & Attributions',
    lead: 'Copyright information, source code licenses, model weight terms, and photo attributions.',
    codeTitle: 'Source Code & Base Frameworks',
    codeKerasDesc:
      'Training pipeline components and the MobileNetV3 base architecture utilize code from Keras under the Apache License, Version 2.0 (Copyright © Keras team). Full license text: https://www.apache.org/licenses/LICENSE-2.0.',
    codeAppDesc:
      'The application code for Grzybobranie AI and related helper scripts in this repository remain protected by copyright: All rights reserved by the repository owner (Wojciech Bubolka).',
    modelWeightsTitle: 'AI Model Weights',
    modelWeightsDesc:
      'Base pretrained MobileNetV3 weights (ImageNet) are subject to ImageNet non-commercial research and educational terms. Final model weights fine-tuned for Grzybobranie AI are proprietary works: All rights reserved. Production weights strictly exclude Danish Fungi 2020 (DF20) data pending commercial consent.',
    photosTitle: 'Mushroom Photographs',
    photosDesc:
      'All mushroom photographs displayed in the app are sourced exclusively from the lonwi/grzybobranie-zdjecia dataset on Hugging Face, curated from iNaturalist and GBIF under:',
    photoLicensesList: [
      'Creative Commons CC0 (Public Domain Dedication)',
      'Creative Commons Attribution (CC BY 4.0 and versioned equivalents) — requires attribution and license link.',
    ],
    photosAttributionNote:
      'User-facing views strictly reject non-commercial (CC BY-NC) and Share-Alike (CC BY-SA) licenses. Individual author attributions are listed below.',
    emptyAttributionsNotice:
      'In this preview build, the local photo attribution catalog is currently being linked from the Hugging Face dataset. A complete author ledger will be bundled before store release.',
  },
  notFound: {
    title: '404 — Page Not Found',
    lead: 'The page you are looking for does not exist or has been moved.',
    backHome: 'Return to Home',
  },
} as const;
