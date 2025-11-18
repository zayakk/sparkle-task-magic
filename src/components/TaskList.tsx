import { Card } from "./ui/card";

interface Task {
  title: string;
  category: string;
  color: string;
  deadline?: string;
}

interface TaskListProps {
  tasks: Task[];
}

export const TaskList = ({ tasks }: TaskListProps) => {
  if (tasks.length === 0) {
    return <p className="text-center text-muted-foreground">No tasks yet 😴</p>;
  }

  return (
    <div className="space-y-3">
      {tasks.map((task, i) => (
        <Card key={i} className="p-4 border-2 flex justify-between items-center">
          <div>
            <h3 className="font-semibold text-lg">{task.title}</h3>
            <p className="text-sm text-muted-foreground">
              {task.category} 
              {task.deadline && <> • Due: {task.deadline}</>}
            </p>
          </div>
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: task.color }}
          />
        </Card>
      ))}
    </div>
  );
};
