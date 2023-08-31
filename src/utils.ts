import { inspect } from 'util';

export const print = (object: any) => console.log(inspect(object, false, null, true /* enable colors */));
