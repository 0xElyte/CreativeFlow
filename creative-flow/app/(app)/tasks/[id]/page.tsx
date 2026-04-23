import TaskDetailPage from "@/components/dashboard/TaskDetailPage"

interface Props {
  params: Promise<{ id: string }>
}

export default async function Page({ params }: Props) {
  const { id } = await params
  return <TaskDetailPage taskId={id} />
}
