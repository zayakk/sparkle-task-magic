import { useState } from "react";
import { Plus, Calendar } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card } from "./ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

const categories = [
  { name: "Work", color: "#9b87f5" },
  { name: "Personal", color: "#FFB6D9" },
  { name: "Shopping", color: "#F97316" },
  { name: "Health", color: "#0EA5E9" },
  { name: "Study", color: "#10B981" },
];

interface AddTaskFormProps {
  onAdd: (title: string, category: string, color: string, deadline?: string) => void;
}

export const AddTaskForm = ({ onAdd }: AddTaskFormProps) => {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState(categories[0].name);
  const [deadline, setDeadline] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim()) {
      const selectedCategory = categories.find(c => c.name === category) || categories[0];
      onAdd(title, category, selectedCategory.color, deadline || undefined);
      setTitle("");
      setDeadline("");
    }
  };

  return (
    <Card className="p-6 mb-6 bg-card shadow-soft border-2 border-border animate-slide-up">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <Input
            placeholder="✨ ..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="flex-1 text-base border-2 focus-visible:ring-primary"
          />
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-full sm:w-40 border-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {categories.map((cat) => (
                <SelectItem key={cat.name} value={cat.name}>
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: cat.color }}
                    />
                    {cat.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 flex items-center gap-2 border-2 border-border rounded-lg px-3 py-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <Input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="border-0 p-0 h-auto focus-visible:ring-0"
              min={new Date().toISOString().split('T')[0]}
            />
          </div>
          <Button 
            type="submit" 
            className="bg-gradient-magic hover:shadow-glow-primary transition-all duration-300 font-semibold"
            // className="bg-gradient-magic hover:shadow-glow-primary transition-all duration-300 font-semibold"
          >
            <Plus className="w-5 h-5 mr-2" />
            Add Tasksssss
          </Button>
        </div>
      </form>
    </Card>
  );
};
