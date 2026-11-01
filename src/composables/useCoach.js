import { ref } from 'vue';

const isCoachOpen = ref(false);

export const useCoach = () => {
  const openCoach = () => {
    isCoachOpen.value = true;
  };
  const closeCoach = () => {
    isCoachOpen.value = false;
  };
  const toggleCoach = () => {
    isCoachOpen.value = !isCoachOpen.value;
  };

  return { isCoachOpen, openCoach, closeCoach, toggleCoach };
};
