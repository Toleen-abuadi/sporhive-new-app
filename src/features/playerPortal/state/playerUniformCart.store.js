import { createContext, useContext, useEffect, useMemo, useReducer } from 'react';
import { preferenceStorage } from '../../../services/storage';
import { usePlayerPortalSession } from '../hooks/usePlayerPortalSession';

const PlayerUniformCartContext = createContext(null);

const INITIAL_CART_STATE = Object.freeze({
  hydrated: false,
  storageKey: '',
  items: [],
  printing: {
    playerNumber: '',
    nickname: '',
  },
  updatedAt: null,
});

const ACTIONS = Object.freeze({
  HYDRATE: 'HYDRATE',
  ADD_OR_MERGE_ITEM: 'ADD_OR_MERGE_ITEM',
  UPDATE_ITEM: 'UPDATE_ITEM',
  REMOVE_ITEM: 'REMOVE_ITEM',
  SET_PRINTING: 'SET_PRINTING',
  CLEAR: 'CLEAR',
});

const cleanString = (value) => {
  if (value == null) return '';
  return String(value).trim();
};

const toNumber = (value) => {
  if (value == null || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const toInteger = (value, fallback = 0) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.trunc(parsed);
};

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const buildItemKey = (productId, variantId) => `${cleanString(productId)}:${cleanString(variantId)}`;

const normalizePrinting = (printing) => ({
  playerNumber: cleanString(printing?.playerNumber).replace(/[^\d]/g, '').slice(0, 6),
  nickname: cleanString(printing?.nickname).slice(0, 24),
});

const normalizeCartItem = (item) => {
  const productId = toNumber(item?.productId);
  const variantId = toNumber(item?.variantId);
  const maxQuantity = Math.max(1, toInteger(item?.maxQuantity, 1));
  const quantity = clamp(Math.max(1, toInteger(item?.quantity, 1)), 1, maxQuantity);

  return {
    key: buildItemKey(productId, variantId),
    productId,
    variantId,
    productNameEn: cleanString(item?.productNameEn),
    productNameAr: cleanString(item?.productNameAr),
    imageUri: cleanString(item?.imageUri),
    needPrinting: Boolean(item?.needPrinting),
    size: cleanString(item?.size),
    unitPrice: toNumber(item?.unitPrice) || 0,
    quantity,
    maxQuantity,
    updatedAt: item?.updatedAt || new Date().toISOString(),
  };
};

const preparePersistedState = (state) => ({
  items: state.items.map((item) => ({
    ...item,
  })),
  printing: normalizePrinting(state.printing),
  updatedAt: state.updatedAt || new Date().toISOString(),
});

const normalizePersistedState = (value, storageKey) => {
  const raw = value && typeof value === 'object' ? value : {};
  const items = Array.isArray(raw.items) ? raw.items.map(normalizeCartItem).filter((item) => item.variantId != null) : [];

  return {
    hydrated: true,
    storageKey: storageKey || '',
    items,
    printing: normalizePrinting(raw.printing),
    updatedAt: cleanString(raw.updatedAt) || new Date().toISOString(),
  };
};

const mergeItemsByKey = (items) => {
  const table = items.reduce((acc, item) => {
    if (!item?.key) return acc;
    const found = acc[item.key];
    if (!found) {
      acc[item.key] = item;
      return acc;
    }
    const nextQty = clamp(found.quantity + item.quantity, 1, Math.max(found.maxQuantity, item.maxQuantity));
    acc[item.key] = {
      ...found,
      ...item,
      quantity: nextQty,
      maxQuantity: Math.max(found.maxQuantity, item.maxQuantity),
      updatedAt: new Date().toISOString(),
    };
    return acc;
  }, {});

  return Object.values(table);
};

function reducer(state, action) {
  switch (action.type) {
    case ACTIONS.HYDRATE: {
      return {
        ...normalizePersistedState(action.payload?.persisted, action.payload?.storageKey),
      };
    }

    case ACTIONS.ADD_OR_MERGE_ITEM: {
      const incoming = normalizeCartItem(action.payload?.item);
      if (incoming.variantId == null || incoming.productId == null) return state;

      const nextItems = mergeItemsByKey([...state.items, incoming]);
      return {
        ...state,
        items: nextItems,
        printing: action.payload?.printing ? normalizePrinting(action.payload.printing) : state.printing,
        updatedAt: new Date().toISOString(),
      };
    }

    case ACTIONS.UPDATE_ITEM: {
      const itemKey = cleanString(action.payload?.itemKey);
      if (!itemKey) return state;
      const patch = action.payload?.patch || {};

      const nextItems = state.items.map((item) => {
        if (item.key !== itemKey) return item;
        const maxQuantity = Math.max(1, toInteger(patch.maxQuantity, item.maxQuantity));
        const quantity = clamp(Math.max(1, toInteger(patch.quantity, item.quantity)), 1, maxQuantity);
        return {
          ...item,
          ...patch,
          maxQuantity,
          quantity,
          updatedAt: new Date().toISOString(),
        };
      });

      return {
        ...state,
        items: mergeItemsByKey(nextItems),
        updatedAt: new Date().toISOString(),
      };
    }

    case ACTIONS.REMOVE_ITEM: {
      const itemKey = cleanString(action.payload?.itemKey);
      if (!itemKey) return state;
      return {
        ...state,
        items: state.items.filter((item) => item.key !== itemKey),
        updatedAt: new Date().toISOString(),
      };
    }

    case ACTIONS.SET_PRINTING: {
      return {
        ...state,
        printing: normalizePrinting(action.payload),
        updatedAt: new Date().toISOString(),
      };
    }

    case ACTIONS.CLEAR:
      return {
        ...state,
        items: [],
        printing: {
          playerNumber: '',
          nickname: '',
        },
        updatedAt: new Date().toISOString(),
      };

    default:
      return state;
  }
}

const buildStorageKey = (session) => {
  const sessionKey = cleanString(session?.sessionKey);
  if (!sessionKey) return '';
  return `sporhive_player_uniform_cart_${sessionKey}`;
};

export function PlayerUniformCartProvider({ children }) {
  const session = usePlayerPortalSession();
  const [state, dispatch] = useReducer(reducer, INITIAL_CART_STATE);
  const storageKey = buildStorageKey(session);

  useEffect(() => {
    let active = true;

    const hydrate = async () => {
      if (!storageKey || !session.canAccessPortal) {
        if (active) {
          dispatch({
            type: ACTIONS.HYDRATE,
            payload: {
              storageKey,
              persisted: {},
            },
          });
        }
        return;
      }

      const persisted = await preferenceStorage.getItem(storageKey, {});
      if (!active) return;

      dispatch({
        type: ACTIONS.HYDRATE,
        payload: {
          storageKey,
          persisted,
        },
      });
    };

    hydrate();

    return () => {
      active = false;
    };
  }, [session.canAccessPortal, storageKey]);

  useEffect(() => {
    if (!state.hydrated || !state.storageKey) return;
    preferenceStorage.setItem(state.storageKey, preparePersistedState(state)).catch(() => {});
  }, [state]);

  const actions = useMemo(
    () => ({
      addItem(item, { printing = null } = {}) {
        dispatch({
          type: ACTIONS.ADD_OR_MERGE_ITEM,
          payload: { item, printing },
        });
      },
      updateItem(itemKey, patch) {
        dispatch({
          type: ACTIONS.UPDATE_ITEM,
          payload: { itemKey, patch },
        });
      },
      removeItem(itemKey) {
        dispatch({
          type: ACTIONS.REMOVE_ITEM,
          payload: { itemKey },
        });
      },
      setPrinting(printing) {
        dispatch({
          type: ACTIONS.SET_PRINTING,
          payload: printing,
        });
      },
      clearCart() {
        dispatch({ type: ACTIONS.CLEAR });
      },
    }),
    []
  );

  const summary = useMemo(() => {
    const totalItems = state.items.reduce((sum, item) => sum + (toNumber(item.quantity) || 0), 0);
    const subtotal = state.items.reduce(
      (sum, item) => sum + (toNumber(item.quantity) || 0) * (toNumber(item.unitPrice) || 0),
      0
    );
    const hasPrintingItems = state.items.some((item) => item.needPrinting);

    return {
      totalItems,
      subtotal,
      hasPrintingItems,
    };
  }, [state.items]);

  const value = useMemo(
    () => ({
      state,
      actions,
      summary,
    }),
    [actions, state, summary]
  );

  return (
    <PlayerUniformCartContext.Provider value={value}>
      {children}
    </PlayerUniformCartContext.Provider>
  );
}

export function usePlayerUniformCart() {
  const context = useContext(PlayerUniformCartContext);
  if (!context) {
    throw new Error('usePlayerUniformCart must be used inside PlayerUniformCartProvider.');
  }
  return context;
}
