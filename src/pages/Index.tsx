import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { AddTaskForm } from "@/components/AddTaskForm";
import { TaskCard, Task } from "@/components/TaskCard";
import { FilterBar } from "@/components/FilterBar";
import { useToast } from "@/hooks/use-toast";
import { Trophy, Target, LogOut, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import confetti from "canvas-confetti";

const Index = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [points, setPoints] = useState(0);
  const [level, setLevel] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  useEffect(() => {
    loadTasks();
    loadUserStats();
  }, []);

  const loadTasks = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("tasks")
      .select("*")
      .or(`user_id.eq.${user.id},assigned_to.eq.${user.id}`)
      .order("created_at", { ascending: false });

    if (data) setTasks(data);
  };

  const loadUserStats = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("user_stats")
      .select("points, level")
      .eq("user_id", user.id)
      .single();

    if (data) {
      setPoints(data.points || 0);
      setLevel(data.level || 1);
    }
  };

  const celebrateCompletion = () => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#9b87f5', '#FFB6D9', '#E5DEFF']
    });
  };

  const addTask = async (title: string, category: string, color: string, deadline?: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("tasks").insert({
      user_id: user.id,
      title,
      category,
      color,
      deadline,
      completed: false,
    });

    if (!error) {
      toast({ title: "✨ Даалгавар нэмэгдлээ!" });
      loadTasks();
    }
  };

  const toggleTask = async (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    const newCompleted = !task.completed;
    await supabase.from("tasks").update({ completed: newCompleted }).eq("id", id);

    if (newCompleted) {
      const earnedPoints = task.points_reward || 10;
      const newPoints = points + earnedPoints;
      const newLevel = Math.floor(newPoints / 100) + 1;

      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from("user_stats").update({ 
        points: newPoints, 
        level: newLevel,
        tasks_completed: (await supabase.from("tasks").select("id").eq("user_id", user?.id).eq("completed", true)).data?.length || 0
      }).eq("user_id", user?.id);

      setPoints(newPoints);
      if (newLevel > level) {
        setLevel(newLevel);
        toast({ title: "🎉 Түвшин өслөө!", description: `Та ${newLevel} түвшинд хүрлээ!` });
      } else {
        toast({ title: `🌟 +${earnedPoints} оноо!`, description: "Сайн ажилласан!" });
      }
      celebrateCompletion();
    }

    loadTasks();
  };

  const deleteTask = async (id: string) => {
    await supabase.from("tasks").delete().eq("id", id);
    toast({ title: "🗑️ Даалгавар устгагдлаа" });
    loadTasks();
  };

  const editTask = async (id: string, newTitle: string) => {
    await supabase.from("tasks").update({ title: newTitle }).eq("id", id);
    toast({ title: "✏️ Даалгавар шинэчлэгдлээ" });
    loadTasks();
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
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
        <div className="flex gap-2 mb-4 justify-end">
          <Button onClick={() => navigate("/challenges")} variant="outline">
            <Zap className="w-4 h-4 mr-2" />
            Сорилтууд
          </Button>
          <Button onClick={handleLogout} variant="outline">
            <LogOut className="w-4 h-4 mr-2" />
            Гарах
          </Button>
        </div>

        <Header points={points} level={level} />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-card rounded-2xl p-6 shadow-soft border-2 border-primary/20 animate-slide-up">
            <div className="flex items-center gap-3 mb-2">
              <Target className="w-6 h-6 text-primary animate-float" />
              <h3 className="font-bold text-lg">Идэвхтэй</h3>
            </div>
            <p className="text-3xl font-bold text-primary">{activeTasks.length}</p>
          </div>
          
          <div className="bg-card rounded-2xl p-6 shadow-soft border-2 border-secondary/20 animate-slide-up">
            <div className="flex items-center gap-3 mb-2">
              <Trophy className="w-6 h-6 text-secondary animate-float" />
              <h3 className="font-bold text-lg">Дууссан</h3>
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
                  ? "Даалгавар олдсонгүй!"
                  : "Даалгавар нэмээрэй!"}
              </p>
            </div>
          ) : (
            <>
              {activeTasks.map((task, index) => (
                <div key={task.id} style={{ animationDelay: `${index * 0.05}s` }}>
                  <TaskCard task={task} onToggle={toggleTask} onDelete={deleteTask} onEdit={editTask} />
                </div>
              ))}
              {completedTasks.map((task, index) => (
                <div key={task.id} style={{ animationDelay: `${(activeTasks.length + index) * 0.05}s` }}>
                  <TaskCard task={task} onToggle={toggleTask} onDelete={deleteTask} onEdit={editTask} />
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
