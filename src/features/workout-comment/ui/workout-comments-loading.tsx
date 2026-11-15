export function WorkoutCommentsLoading() {
  return (
    <section aria-labelledby="workout-comments-title" aria-busy="true" className="flex flex-col gap-4">
      <h2 id="workout-comments-title" className="font-semibold text-title">
        응원 댓글
      </h2>
      <p role="status" className="text-body text-muted-foreground">
        댓글을 불러오는 중…
      </p>
    </section>
  );
}
