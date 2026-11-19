/* Máquina de estados da varredura por duas etapas (grupo → item). */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.ScanEngine = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const LEVELS = { group: 'grupo', item: 'item' };

  const DEFAULT_GROUPS = [
    {
      id: 'a-f',
      label: 'A até F',
      items: [
        { id: 'a', label: 'A', type: 'char', value: 'a' },
        { id: 'b', label: 'B', type: 'char', value: 'b' },
        { id: 'c', label: 'C', type: 'char', value: 'c' },
        { id: 'd', label: 'D', type: 'char', value: 'd' },
        { id: 'e', label: 'E', type: 'char', value: 'e' },
        { id: 'f', label: 'F', type: 'char', value: 'f' },
      ],
    },
    {
      id: 'g-l',
      label: 'G até L',
      items: [
        { id: 'g', label: 'G', type: 'char', value: 'g' },
        { id: 'h', label: 'H', type: 'char', value: 'h' },
        { id: 'i', label: 'I', type: 'char', value: 'i' },
        { id: 'j', label: 'J', type: 'char', value: 'j' },
        { id: 'k', label: 'K', type: 'char', value: 'k' },
        { id: 'l', label: 'L', type: 'char', value: 'l' },
      ],
    },
    {
      id: 'm-r',
      label: 'M até R',
      items: [
        { id: 'm', label: 'M', type: 'char', value: 'm' },
        { id: 'n', label: 'N', type: 'char', value: 'n' },
        { id: 'o', label: 'O', type: 'char', value: 'o' },
        { id: 'p', label: 'P', type: 'char', value: 'p' },
        { id: 'q', label: 'Q', type: 'char', value: 'q' },
        { id: 'r', label: 'R', type: 'char', value: 'r' },
      ],
    },
    {
      id: 's-z',
      label: 'S até Z',
      items: [
        { id: 's', label: 'S', type: 'char', value: 's' },
        { id: 't', label: 'T', type: 'char', value: 't' },
        { id: 'u', label: 'U', type: 'char', value: 'u' },
        { id: 'v', label: 'V', type: 'char', value: 'v' },
        { id: 'w', label: 'W', type: 'char', value: 'w' },
        { id: 'x', label: 'X', type: 'char', value: 'x' },
        { id: 'y', label: 'Y', type: 'char', value: 'y' },
        { id: 'z', label: 'Z', type: 'char', value: 'z' },
      ],
    },
    {
      id: 'acoes',
      label: 'Ações',
      items: [
        { id: 'space', label: 'Espaço', type: 'action', action: 'space' },
        { id: 'back', label: 'Apagar', type: 'action', action: 'backspace' },
        { id: 'say', label: 'Falar', type: 'action', action: 'speak' },
        { id: 'clear', label: 'Limpar', type: 'action', action: 'clear' },
      ],
    },
    {
      id: 'frases',
      label: 'Frases',
      items: [
        { id: 'p1', label: 'Preciso de ajuda', type: 'phrase', value: 'Preciso de ajuda.' },
        { id: 'p2', label: 'Sim', type: 'phrase', value: 'Sim.' },
        { id: 'p3', label: 'Não', type: 'phrase', value: 'Não.' },
        { id: 'p4', label: 'Um momento', type: 'phrase', value: 'Um momento, por favor.' },
      ],
    },
  ];

  function initialState() {
    return { level: LEVELS.group, group: 0, item: 0 };
  }

  function groupCount(groups) {
    return (groups || DEFAULT_GROUPS).length;
  }

  function currentGroup(state, groups) {
    return (groups || DEFAULT_GROUPS)[state.group] || null;
  }

  function currentItem(state, groups) {
    if (state.level !== LEVELS.item) return null;
    const group = currentGroup(state, groups);
    if (!group) return null;
    return group.items[state.item] || null;
  }

  function next(state, groups) {
    const list = groups || DEFAULT_GROUPS;
    if (!list.length) return initialState();
    const total = list.length;

    if (state.level === LEVELS.group) {
      return { level: LEVELS.group, group: (state.group + 1) % total, item: 0 };
    }

    const group = list[state.group];
    const count = group ? group.items.length : 0;
    if (!count) return { level: LEVELS.group, group: (state.group + 1) % total, item: 0 };
    return { level: LEVELS.item, group: state.group, item: (state.item + 1) % count };
  }

  function back(state, groups) {
    const list = groups || DEFAULT_GROUPS;
    if (state.level === LEVELS.item) {
      return { level: LEVELS.group, group: state.group, item: 0 };
    }
    const total = list.length || 1;
    return { level: LEVELS.group, group: (state.group - 1 + total) % total, item: 0 };
  }

  function activate(state, groups) {
    const list = groups || DEFAULT_GROUPS;

    if (state.level === LEVELS.group) {
      const group = list[state.group];
      const hasItems = Boolean(group && group.items.length);
      return {
        state: hasItems
          ? { level: LEVELS.item, group: state.group, item: 0 }
          : { level: LEVELS.group, group: (state.group + 1) % (list.length || 1), item: 0 },
        action: null,
      };
    }

    const item = currentItem(state, list);
    return {
      state: { level: LEVELS.group, group: state.group, item: 0 },
      action: item || null,
    };
  }

  function goTo(state, groups, groupId) {
    const list = groups || DEFAULT_GROUPS;
    const index = list.findIndex((group) => group.id === groupId);
    if (index < 0) return state;
    return { level: LEVELS.group, group: index, item: 0 };
  }

  function goToItem(state, groups, groupId, itemId) {
    const list = groups || DEFAULT_GROUPS;
    const groupIndex = list.findIndex((group) => group.id === groupId);
    if (groupIndex < 0) return state;
    const itemIndex = list[groupIndex].items.findIndex((item) => item.id === itemId);
    if (itemIndex < 0) return state;
    return { level: LEVELS.item, group: groupIndex, item: itemIndex };
  }

  function describe(state, groups) {
    const list = groups || DEFAULT_GROUPS;
    if (state.level === LEVELS.group) {
      const group = list[state.group];
      return group ? `grupo ${group.label}` : 'grupo';
    }
    const item = currentItem(state, list);
    return item ? item.label : 'item';
  }

  return {
    LEVELS,
    DEFAULT_GROUPS,
    initialState,
    next,
    back,
    activate,
    goTo,
    goToItem,
    currentGroup,
    currentItem,
    describe,
    groupCount,
  };
});
