import { Subject, Subscription } from 'rxjs';
import { scan } from 'rxjs/operators';

// Mock-up of your existing services
const getInscription = async (inscriptionId: string) => {
  // Simulate an API call to get Inscription
  return {
    inscription: {
      // Your inscription object
    },
  };
};

const isSpent = async (inscription: any) => {
  // Simulate an API call to check if inscription is spent
  return {
    spent: false,
  };
};

const nostrPool = {
  subscribeOrders: (params: any) => {
    // Simulate an API subscription
    // Should be replaced with your real subscription
    return new Subject();
  },
};

const MAX_ONSALE = 200;

const updateInscriptions = (acc: any[], curr: any) => {
  const existingIndex = acc.findIndex((item) => item.inscriptionId === curr.inscriptionId && item.num === curr.num);

  if (existingIndex !== -1) {
    // Assuming takeLatestInscription is a function that takes two inscriptions
    // and returns a boolean indicating if the second should replace the first
    if (takeLatestInscription(acc[existingIndex], curr)) {
      acc[existingIndex] = curr;
    }
  } else {
    acc.push(curr);
  }

  return acc.sort((a, b) => b.created_at - a.created_at).slice(0, MAX_ONSALE);
};

const takeLatestInscription = (a: any, b: any) => {
  // Your implementation here
  return true;
};

const main = () => {
  let openOrders: any[] = [];
  const addOpenOrder$ = new Subject();
  let orderSubscription: Subscription;
  let addSubscription: Subscription;
  let utxosReady = false;

  const addNewOpenOrder = (order: any) => {
    addOpenOrder$.next(order);
    if (!utxosReady) {
      utxosReady = true;
    }
  };

  const getInscriptionData = async (event: any) => {
    const { inscription } = await getInscription(event.inscriptionId);
    return {
      ...inscription,
      ...event,
    };
  };

  addSubscription = addOpenOrder$.pipe(scan(updateInscriptions, openOrders)).subscribe((newOrders) => {
    openOrders = newOrders;
  });

  orderSubscription = nostrPool
    .subscribeOrders({ limit: MAX_ONSALE, type: 'some_type', address: 'some_address' })
    .subscribe(async (event) => {
      try {
        const inscription = await getInscriptionData(event);
        const isSpentUtxo = await isSpent(inscription);
        if (isSpentUtxo.spent) {
          console.log('utxo is spent', inscription);
          return;
        }
        addNewOpenOrder(inscription);
      } catch (error) {
        console.error(error);
      }
    });

  // Cleanup
  return () => {
    try {
      orderSubscription.unsubscribe();
      addSubscription.unsubscribe();
    } catch (err) {
      console.error(err);
    }
  };
};

const cleanup = main();

// Cleanup resources when needed
// cleanup();
