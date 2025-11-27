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
  const [userId, setUserId] = useState<string | null>(null);
  const [points, setPoints] = useState(0);
  const [level, setLevel] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedColor, setSelectedColor] = useState("all");

  useEffect(() => {
    // Prime auth session faster than getUser()
    supabase.auth.getSession().then(({ data: { session } }) => {
      const uid = session?.user?.id || null;
      setUserId(uid);
      if (uid) {
        loadTasks();
        loadUserStats();
      }
    });
  }, []);

  const loadTasks = async () => {
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData?.user?.id;
  if (!uid) return;

  // Хэрэглэгчийн role авах
  const { data: roleData } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", uid)
    .single();

  if (!roleData) return;

  let { data: tasksData, error } = { data: null, error: null };

  console.log("loads", userData.user.user_metadata.class_name);
  if (roleData.role === "teacher") {
    // Багш: өөрийн өгсөн даалгаврууд
    ({ data: tasksData, error } = await supabase
      .from("tasks")
      .select("*")
      .eq("user_id", uid)
      .order("created_at", { ascending: false }));
  } else {
    // Сурагч: өөртөө хамаарах даалгавар
    ({ data: tasksData, error } = await supabase
      .from("tasks")
      .select("*")
      .or(`user_id.eq.${uid},assigned_to.eq.${uid}`)
      .order("created_at", { ascending: false }));
  }

  if (error) {
    console.error("Error loading tasks:", error);
    setTasks([]);
  } else {
    setTasks(tasksData || []);
  }
};



  const loadUserStats = async () => {
    const uid = userId || (await supabase.auth.getUser()).data.user?.id;
    if (!uid) return;

    const { data } = await supabase
      .from("user_stats")
      .select("points, level")
      .eq("user_id", uid)
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
const teacherTasks = tasks.filter(t => t.assigned_by && t.assigned_by !== userId);


  const addTask = async (title: string, category: string, color: string, deadline?: string, assignedTo?: string) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { error } = await supabase.from("tasks").insert({
    title,
    category,
    color,
    deadline,
    completed: false,
    assigned_by: user.id,      // БАГШ
    assigned_to: user.id,   // СУРАГЧ
    user_id: user.id        // Энэ даалгавар сурагчид хамаарна
  })

  if (!error) {
    toast({ title: "✨ Даалгавар нэмэгдлээ!" });
    loadTasks();
  }
};


  const toggleTask = async (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    const newCompleted = !task.completed;
    await supabase.from("tasks").update({ completed: newCompleted, completed_at: newCompleted ? new Date().toISOString() : null }).eq("id", id);

    if (newCompleted) {
      const earnedPoints = task.points_reward || 10;
      const newPoints = points + earnedPoints;
      const newLevel = Math.floor(newPoints / 100) + 1;

      const { data: { user: authUser } } = await supabase.auth.getUser();
      await supabase.from("user_stats").update({ 
        points: newPoints, 
        level: newLevel,
        tasks_completed: (await supabase.from("tasks").select("id").eq("user_id", authUser?.id).eq("completed", true)).data?.length || 0
      }).eq("user_id", authUser?.id);

      setPoints(newPoints);
      if (newLevel > level) {
        setLevel(newLevel);
        toast({ title: "🎉 Түвшин өслөө!", description: `Та ${newLevel} түвшинд хүрлээ!` });
      } else {
        toast({ title: `🌟 +${earnedPoints} оноо!`, description: "Сайн ажилласан!" });
      }
      celebrateCompletion();

      // Auto-unlock achievements after completing a task
      if (authUser) {
        const { data: stats } = await supabase
          .from("user_stats")
          .select("points, level, tasks_completed, current_streak")
          .eq("user_id", authUser.id)
          .single();
        if (stats) {
          const { data: achievements } = await supabase
            .from("achievements")
            .select("id, requirement_type, requirement_value");
          if (achievements) {
            for (const a of achievements) {
              const meets =
                (a.requirement_type === "tasks_completed" && (stats.tasks_completed || 0) >= a.requirement_value) ||
                (a.requirement_type === "level" && (stats.level || 1) >= a.requirement_value) ||
                (a.requirement_type === "current_streak" && (stats.current_streak || 0) >= a.requirement_value);
              if (meets) {
                await supabase.from("user_achievements").upsert({ user_id: authUser.id, achievement_id: a.id });
              }
            }
          }
        }
      }
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

  useEffect(() => {
    // Request notification permission once
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }
  }, []);

  useEffect(() => {
    // Schedule simple in-tab reminders for deadlines within 24h
    const timers: number[] = [];
    if ("Notification" in window && Notification.permission === "granted") {
      tasks.forEach((task) => {
        if (!task.completed && task.deadline) {
          const deadlineTs = new Date(task.deadline).getTime();
          const now = Date.now();
          const remindAt = deadlineTs - 24 * 60 * 60 * 1000; // 24h before
          const delay = remindAt - now;
          if (delay > 0 && delay < 24 * 60 * 60 * 1000) {
            const id = window.setTimeout(() => {
              new Notification("⏰ Хугацаа дөхөж байна", { body: task.title });
              toast({ title: "⏰ Хугацаа дөхөж байна", description: task.title });
            }, delay);
            timers.push(id);
          }
        }
      });
    }
    return () => { timers.forEach(id => clearTimeout(id)); };
  }, [tasks]);

  // Realtime updates for tasks
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel("tasks-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tasks" },
        (payload) => {
          const t: any = payload.new || payload.old;
          if (!t) return;
          // React only if relevant to current user
          if (t.user_id === userId || t.assigned_to === userId) {
            loadTasks();
            loadUserStats();
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  const categories = Array.from(new Set(tasks.map(task => task.category)));
  const colors = Array.from(new Set(tasks.map(task => task.color)));
  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "all" || task.category === selectedCategory;
    const matchesColor = selectedColor === "all" || task.color === selectedColor;
    return matchesSearch && matchesCategory && matchesColor;
  });

  const teacherAssignedTasks = filteredTasks.filter(t => !t.completed && t.assigned_by && t.assigned_by !== userId);
  const personalTasks = filteredTasks.filter(t => !t.completed && (!t.assigned_by || t.assigned_by === userId));
  const completedTasks = filteredTasks.filter(t => t.completed);

  return (
    <div className="min-h-screen bg-gradient-subtle p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex gap-2 mb-4 justify-end">
          {/* <Button onClick={() => navigate("/challenges")} variant="outline">
            <Zap className="w-4 h-4 mr-2" />
            Сорилтууд
          </Button> */}
          <Button onClick={handleLogout} variant="outline">
            <LogOut className="w-4 h-4 mr-2" />
            Гарах
          </Button>
        </div>

        <Header points={points} level={level} />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">

          <div className="bg-card rounded-2xl p-6 shadow-soft border-2 border-accent/30 animate-slide-up">
            <div className="flex items-center gap-3 mb-2">
              <Target className="w-6 h-6 text-accent animate-float" />
              <h3 className="font-bold text-lg">Багшийн даалгавар</h3>
            </div>
            <p className="text-3xl font-bold text-accent">{teacherAssignedTasks.length}</p>
          </div>

          <div className="bg-card rounded-2xl p-6 shadow-soft border-2 border-primary/20 animate-slide-up">
            <div className="flex items-center gap-3 mb-2">
              <Target className="w-6 h-6 text-primary animate-float" />
              <h3 className="font-bold text-lg">Идэвхтэй</h3>
            </div>
            <p className="text-3xl font-bold text-primary">{personalTasks.length}</p>
          </div>

          <div className="bg-card rounded-2xl p-6 shadow-soft border-2 border-secondary/20 animate-slide-up">
            <div className="flex items-center gap-3 mb-2">
              <Trophy className="w-6 h-6 text-secondary animate-float" />
              <h3 className="font-bold text-lg">Дууссан</h3>
            </div>
            <p className="text-3xl font-bold text-secondary">{completedTasks.length}</p>
          </div>

        </div>
      </div>



        <AddTaskForm onAdd={addTask} />
        <FilterBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
          categories={categories}
          selectedColor={selectedColor}
          onColorChange={setSelectedColor}
          colors={colors}
        />

        <div className="space-y-6 max-w-6xl mx-auto mt-6">
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
{teacherAssignedTasks.length > 0 && (
  <div className="space-y-3">
    <div className="flex items-center gap-2 px-2">
      <div className="w-1 h-6 bg-accent rounded-full"></div>
      <h2 className="text-xl font-bold text-accent">Багшийн даалгавар</h2>
    </div>
    
    <div className="space-y-3">
      {teacherAssignedTasks.map((task, index) => (
        <div
          key={task.id}
          style={{ animationDelay: `${index * 0.05}s` }}
          className="relative"
        >
          <div className="absolute -left-2 top-0 bottom-0 w-1 bg-accent/30 rounded-full"></div>
          <TaskCard
            task={task}
            onToggle={toggleTask}
            onDelete={deleteTask}
            onEdit={editTask}
          />
        </div>
      ))}
    </div>
  </div>
)}


              {personalTasks.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 px-2">
                    <div className="w-1 h-6 bg-primary rounded-full"></div>
                    <h2 className="text-xl font-bold text-primary">Миний даалгавар</h2>
                  </div>
                  {personalTasks.map((task, index) => (
                    <div key={task.id} style={{ animationDelay: `${(teacherAssignedTasks.length + index) * 0.05}s` }}>
                      <TaskCard task={task} onToggle={toggleTask} onDelete={deleteTask} onEdit={editTask} />
                    </div>
                  ))}
                </div>
              )}

              {completedTasks.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 px-2">
                    <div className="w-1 h-6 bg-secondary rounded-full"></div>
                    <h2 className="text-xl font-bold text-secondary">Дууссан даалгавар</h2>
                  </div>
                  {completedTasks.map((task, index) => (
                    <div key={task.id} style={{ animationDelay: `${(teacherAssignedTasks.length + personalTasks.length + index) * 0.05}s` }}>
                      <TaskCard task={task} onToggle={toggleTask} onDelete={deleteTask} onEdit={editTask} />
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
    </div>
  );
  
};

export default Index;
