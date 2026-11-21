import { deleteUserExercise, saveUserExercise } from "@/entities/exercise/api/user-exercise-actions";
import { getMyExercises, getMyRecordedExerciseNames } from "@/entities/exercise/api/user-exercise-queries";

import { ExerciseListScreen } from "./ui/exercise-list-screen";

export async function ExerciseListPage() {
  const [exercises, recordedNames] = await Promise.all([getMyExercises(), getMyRecordedExerciseNames()]);
  return (
    <ExerciseListScreen
      exercises={exercises}
      recordedNames={recordedNames}
      saveExercise={saveUserExercise}
      deleteExercise={deleteUserExercise}
    />
  );
}
