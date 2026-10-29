import type { ImageSourcePropType } from 'react-native';

// Importing WebP files (converted from JPEG)
import boletusEdulis from '../../assets/mushrooms/boletus_edulis.webp';
import amanitaPhalloides from '../../assets/mushrooms/amanita_phalloides.webp';
import macrolepiotaProcera from '../../assets/mushrooms/macrolepiota_procera.webp';
import cantharellusCibarius from '../../assets/mushrooms/cantharellus_cibarius.webp';
import imleriaBadia from '../../assets/mushrooms/imleria_badia.webp';
import suillusLuteus from '../../assets/mushrooms/suillus_luteus.webp';
import leccinumScabrum from '../../assets/mushrooms/leccinum_scabrum.webp';
import tylopilusFelleus from '../../assets/mushrooms/tylopilus_felleus.webp';
import amanitaMuscaria from '../../assets/mushrooms/amanita_muscaria.webp';
import lactariusDeliciosus from '../../assets/mushrooms/lactarius_deliciosus.webp';
import gyromitraEsculenta from '../../assets/mushrooms/gyromitra_esculenta.webp';
import paxillusInvolutus from '../../assets/mushrooms/paxillus_involutus.webp';

const MUSHROOM_IMAGES: Record<string, ImageSourcePropType> = {
  boletus_edulis: boletusEdulis,
  amanita_phalloides: amanitaPhalloides,
  macrolepiota_procera: macrolepiotaProcera,
  cantharellus_cibarius: cantharellusCibarius,
  imleria_badia: imleriaBadia,
  suillus_luteus: suillusLuteus,
  leccinum_scabrum: leccinumScabrum,
  tylopilus_felleus: tylopilusFelleus,
  amanita_muscaria: amanitaMuscaria,
  lactarius_deliciosus: lactariusDeliciosus,
  gyromitra_esculenta: gyromitraEsculenta,
  paxillus_involutus: paxillusInvolutus,
};

export function getMushroomImage(speciesId: string): ImageSourcePropType | null {
  return MUSHROOM_IMAGES[speciesId] ?? null;
}