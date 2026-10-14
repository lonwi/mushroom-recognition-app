export async function requestMediaLibraryPermissionsAsync() {
  return { status: 'granted', granted: true };
}

export async function launchImageLibraryAsync() {
  return { canceled: true, assets: [] };
}

export const MediaTypeOptions = { Images: 'Images' };
