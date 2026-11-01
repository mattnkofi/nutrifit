import { computed, ref } from 'vue';

const isSessionOpen = ref(false);
const isDetailOpen = ref(false);
const isProfileModalOpen = ref(false);
const activeModalsCount = ref(0);

export const useSession = () => {
  const setSessionOpen = (value) => {
    isSessionOpen.value = value;
  };

  const setDetailOpen = (value) => {
    isDetailOpen.value = value;
  };

  const setProfileModalOpen = (value) => {
    isProfileModalOpen.value = value;
  };

  const setModalOpen = (isOpen) => {
    if (isOpen) {
      activeModalsCount.value++;
    } else {
      activeModalsCount.value = Math.max(0, activeModalsCount.value - 1);
    }
  };

  const hasAnyModalOpen = computed(() => isSessionOpen.value || isDetailOpen.value || isProfileModalOpen.value || activeModalsCount.value > 0);

  return {
    isSessionOpen,
    setSessionOpen,
    isDetailOpen,
    setDetailOpen,
    isProfileModalOpen,
    setProfileModalOpen,
    setModalOpen,
    hasAnyModalOpen,
  };
};
