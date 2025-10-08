import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { AddTaskForm } from "@/components/AddTaskForm";
import { TaskCard, Task } from "@/components/TaskCard";
import { FilterBar } from "@/components/FilterBar";
import { useToast } from "@/hooks/use-toast";
import { Trophy, Target } from "lucide-react";
import confetti from "canvas-confetti";

const Index = () => {
  const { toast } = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [points, setPoints] = useState(0);
  const [level, setLevel] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  useEffect(() => {
    const savedTasks = localStorage.getItem("tasks");
    const savedPoints = localStorage.getItem("points");
    const savedLevel = localStorage.getItem("level");
    
    if (savedTasks) setTasks(JSON.parse(savedTasks));
    if (savedPoints) setPoints(parseInt(savedPoints));
    if (savedLevel) setLevel(parseInt(savedLevel));
  }, []);

  useEffect(() => {
    localStorage.setItem("tasks", JSON.stringify(tasks));
    localStorage.setItem("points", points.toString());
    localStorage.setItem("level", level.toString());
  }, [tasks, points, level]);

  const celebrateCompletion = () => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#9b87f5', '#FFB6D9', '#E5DEFF']
    });
  };

  const addTask = (title: string, category: string, color: string, deadline?: string) => {
    const newTask: Task = {
      id: Date.now().toString(),
      title,
      category,
      color,
      deadline,
      completed: false,
    };
    setTasks([...tasks, newTask]);
    toast({
      title: "✨ Task Added!",
      description: "Your new task is ready to conquer!",
    });
  };

  const toggleTask = (id: string) => {
    setTasks(tasks.map(task => {
      if (task.id === id) {
        const newCompleted = !task.completed;
        if (newCompleted) {
          const earnedPoints = 10;
          const newPoints = points + earnedPoints;
          const newLevel = Math.floor(newPoints / 100) + 1;
          
          setPoints(newPoints);
          if (newLevel > level) {
            setLevel(newLevel);
            toast({
              title: "🎉 Level Up!",
              description: `You've reached level ${newLevel}!`,
            });
            celebrateCompletion();
          } else {
            toast({
              title: "🌟 +10 Points!",
              description: "Great job completing that task!",
            });
            celebrateCompletion();
          }
        } else {
          setPoints(Math.max(0, points - 10));
        }
        return { ...task, completed: newCompleted };
      }
      return task;
    }));
  };

  const deleteTask = (id: string) => {
    setTasks(tasks.filter(task => task.id !== id));
    toast({
      title: "🗑️ Task Deleted",
      description: "Task removed from your list",
    });
  };

  const editTask = (id: string, newTitle: string) => {
    setTasks(tasks.map(task => 
      task.id === id ? { ...task, title: newTitle } : task
    ));
    toast({
      title: "✏️ Task Updated",
      description: "Your task has been edited successfully!",
    });
  };

  const categories = Array.from(new Set(tasks.map(task => task.category)));

  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "all" || task.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const activeTasks = filteredTasks.filter(t => !t.completed);
  const completedTasks = filteredTasks.filter(t => t.completed);

  return (
    <div className="min-h-screen bg-gradient-subtle p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <Header points={points} level={level} />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-card rounded-2xl p-6 shadow-soft border-2 border-primary/20 animate-slide-up">
            <div className="flex items-center gap-3 mb-2">
              <Target className="w-6 h-6 text-primary animate-float" />
              <h3 className="font-bold text-lg">Active Tasks</h3>
            </div>
            <p className="text-3xl font-bold text-primary">{activeTasks.length}</p>
          </div>
          
          <div className="bg-card rounded-2xl p-6 shadow-soft border-2 border-secondary/20 animate-slide-up" style={{ animationDelay: '0.1s' }}>
            <div className="flex items-center gap-3 mb-2">
              <Trophy className="w-6 h-6 text-secondary animate-float" style={{ animationDelay: '0.5s' }} />
              <h3 className="font-bold text-lg">Completed</h3>
            </div>
            <p className="text-3xl font-bold text-secondary">{completedTasks.length}</p>
          </div>
        </div>

        <AddTaskForm onAdd={addTask} />
        
        <FilterBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
          categories={categories}
        />

        <div className="space-y-3">
          {filteredTasks.length === 0 ? (
            <div className="text-center py-12 animate-slide-up">
              <p className="text-2xl mb-2">✨</p>
              <p className="text-muted-foreground">
                {searchQuery || selectedCategory !== "all" 
                  ? "No tasks found. Try a different search or filter!"
                  : "No tasks yet! Add your first magical task above!"}
              </p>
            </div>
          ) : (
            <>
              {activeTasks.map((task, index) => (
                <div key={task.id} style={{ animationDelay: `${index * 0.05}s` }}>
                  <TaskCard
                    task={task}
                    onToggle={toggleTask}
                    onDelete={deleteTask}
                    onEdit={editTask}
                  />
                </div>
              ))}
              {completedTasks.map((task, index) => (
                <div key={task.id} style={{ animationDelay: `${(activeTasks.length + index) * 0.05}s` }}>
                  <TaskCard
                    task={task}
                    onToggle={toggleTask}
                    onDelete={deleteTask}
                    onEdit={editTask}
                  />
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Index;
