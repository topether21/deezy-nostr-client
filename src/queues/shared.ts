import { getInscription } from './../services/nosft';

export const getInscriptionData = async (event: any) => {
  const { inscription } = await getInscription(event.inscriptionId);
  return {
    ...inscription,
    ...event,
  };
};
