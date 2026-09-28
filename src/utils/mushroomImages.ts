import boletusEdulis from '../../assets/mushrooms/boletus_edulis.jpg';
import amanitaPhalloides from '../../assets/mushrooms/amanita_phalloides.jpg';
import macrolepiotaProcera from '../../assets/mushrooms/macrolepiota_procera.jpg';
import cantharellusCibarius from '../../assets/mushrooms/cantharellus_cibarius.jpg';
import imleriaBadia from '../../assets/mushrooms/imleria_badia.jpg';
import suillusLuteus from '../../assets/mushrooms/suillus_luteus.jpg';
import leccinumScabrum from '../../assets/mushrooms/leccinum_scabrum.jpg';
import tylopilusFelleus from '../../assets/mushrooms/tylopilus_felleus.jpg';
import amanitaMuscaria from '../../assets/mushrooms/amanita_muscaria.jpg';
import lactariusDeliciosus from '../../assets/mushrooms/lactarius_deliciosus.jpg';
import gyromitraEsculenta from '../../assets/mushrooms/gyromitra_esculenta.jpg';
import paxillusInvolutus from '../../assets/mushrooms/paxillus_involutus.jpg';

export const MUSHROOM_IMAGES: Record<string, any> = {
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

export function getMushroomImage(speciesId: string): any {
  return MUSHROOM_IMAGES[speciesId] || boletusEdulis;
}
