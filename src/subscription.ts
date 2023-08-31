import { Subject, BehaviorSubject, Subscription } from 'rxjs';
import { scan } from 'rxjs/operators';
import { isSpent, getInscription, takeLatestInscription } from './services/nosft';
import { nostrPool } from './nostr-relay';
import { NosftEvent } from './types';

export const updateInscriptions = (maxOnSale: number) => (acc: NosftEvent[], curr: NosftEvent) => {
  const existingIndex = acc.findIndex((item) => item.inscriptionId === curr.inscriptionId && item.num === curr.num);

  if (existingIndex !== -1) {
    if (takeLatestInscription(acc[existingIndex], curr)) {
      acc[existingIndex] = curr;
    }
  } else {
    acc.push(curr);
  }

  return acc.sort((a, b) => b.created_at - a.created_at).slice(0, maxOnSale);
};

const getInscriptionData = async (event: any) => {
  const { inscription } = await getInscription(event.inscriptionId);
  return {
    ...inscription,
    ...event,
  };
};

export const subscribe = (maxOnSale: number = 100) => {
  const openOrders: NosftEvent[] = [];
  const openOrdersSubject = new BehaviorSubject<NosftEvent[]>([]);
  const addOpenOrder$ = new Subject<NosftEvent>();
  let addSubscription: Subscription;
  let orderSubscription: Subscription;

  addSubscription = addOpenOrder$.pipe(scan(updateInscriptions(maxOnSale), openOrders)).subscribe((newOrders) => {
    openOrders.length = 0;
    openOrders.push(...newOrders);
    openOrdersSubject.next(openOrders);
  });

  orderSubscription = nostrPool.subscribeOrders({ limit: maxOnSale }).subscribe(async (event) => {
    try {
      const inscription = await getInscriptionData(event);
      const isSpentUtxo = await isSpent(inscription);
      if (isSpentUtxo.spent) {
        console.log('utxo is spent', inscription);
        return;
      }
      addOpenOrder$.next(inscription);
    } catch (error) {
      console.error(error);
    }
  });

  return {
    cleanup: () => {
      try {
        orderSubscription.unsubscribe();
        addSubscription.unsubscribe();
      } catch (err) {
        console.error(err);
      }
    },
    openOrders$: openOrdersSubject.asObservable(),
  };
};
