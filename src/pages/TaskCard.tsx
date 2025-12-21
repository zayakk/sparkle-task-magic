import { useState } from "react";
import { Task } from "@/components/TaskCard";

interface Props {
  task: Task;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (id: string, title: string, deadline?: string) => void;
  onSendToTeacher?: (task: Task) => void;
}

export const TaskCard = ({
    task,
    onToggle,
    onDelete,
    onEdit,
    onSendToTeacher,
}: Props) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);
  const [editDeadline, setEditDeadline] = useState(
    task.deadline ? task.deadline.slice(0, 10) : ""
  );

  return (
    <div className="bg-card rounded-xl p-4 shadow-soft border">

      {/* title */}
      <h3 className="font-bold">{task.title}</h3>

      {/* buttons */}
      <div className="flex items-center gap-2 mt-3">
        <button onClick={() => onToggle(task.id)}>✅</button>

        <button onClick={() => setIsEditing(true)}>✏️</button>

        <button onClick={() => onDelete(task.id)}>🗑️</button>

        {onSendToTeacher && (
          <button
            onClick={() => onSendToTeacher(task)}
            className="bg-accent text-white px-2 py-1 rounded text-xs"
          >
            📤 Багш руу
          </button>
        )}
      </div>
    </div>
  );
};
export default TaskCard;