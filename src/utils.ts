import { inspect } from 'util';

export const print = (object: any) => console.log(inspect(object, false, null, true /* enable colors */));

export const isTextInscription = (contentType: string) => {
  return /(text\/plain|application\/json)/.test(contentType);
};
