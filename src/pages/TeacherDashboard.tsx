import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { GraduationCap, LogOut, Moon, Plus, Sun, Trophy, Users } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

interface Student {
  id: string;
  username: string;
  class_name: string;
  points: number;
}

interface Task {
  id: string;
  title: string;
  category: string;
  completed: boolean;
  assigned_to: string;
  student_id: string;   // 🟢 нэм
  student_name: string;
  points_reward: number;
  deadline?: string;
  completed_at?: string;
}

const TeacherDashboard = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [students, setStudents] = useState<Student[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedStudent, setSelectedStudent] = useState("");
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskCategory, setNewTaskCategory] = useState("");
  const [newTaskPoints, setNewTaskPoints] = useState(10);
  const [rewardPoints, setRewardPoints] = useState(10);
  const [rewardComment, setRewardComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [newTaskDeadline, setNewTaskDeadline] = useState("");
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClass, setSelectedClass] = useState("all");
  const categories = ["Бүтээлт", "Өгөгдлийн сан", "Төсөл", "Мат", "Программчлал"];


// Нэг сурагч toggle
const toggleStudent = (id: string) => {
  setSelectedStudents(prev =>
    prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
  );
};


// Бүгдийг сонгох / арилгах
const toggleSelectAll = () => {
  if (selectedStudents.length === students.length) {
    // бүгдийг арилгах
    setSelectedStudents([]);
  } else {
    // бүгдийг сонгох
    setSelectedStudents(students.map((s) => s.id));
  }
};

const filteredStudents = students.filter((s) => {
  const matchesClass = selectedClass === "all" || s.class_name === selectedClass;
  const matchesSearch = s.username.toLowerCase().includes(searchTerm.toLowerCase());
  return matchesClass && matchesSearch;
});

  useEffect(() => {
    loadStudents();
    loadTasks();
    const channel = supabase
      .channel("teacher-tasks-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, () => {
        loadTasks();
        loadStudents();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const loadStudents = async () => {
  try {
    const { data: profilesData, error: profilesError } = await supabase
      .from("profiles")
      .select("*")
      .eq("is_teacher", false);
    // console.log("profilesData", profilesData); 
    if (profilesError) throw profilesError;

    const { data: statsData, error: statsError } = await supabase
      .from("user_stats")
      .select("*");

    // console.log("statsData", statsData); 

    if (statsError) throw statsError;

    const studentsWithPoints = profilesData?.map(profile => ({
      id: profile.id,
      username: profile.username || "Нэргүйй",
      class_name: profile.class_name || "",
      points: statsData?.find(s => s.user_id == profile.id)?.points || 0,
    })) || [];

    // console.log("Loaded students:", studentsWithPoints);
    setStudents(studentsWithPoints);
  } catch (err) {
    console.error("Error loading students:", err);
  }
};


  const loadTasks = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: tasksData, error } = await supabase
      .from("tasks")
      .select("*") // бүх багануудыг авна
      .eq("assigned_by", user.id)
      .order("created_at", { ascending: false });
      // console.log("tasksData", user.id, tasksData);
    if (error) {
      console.error("Load tasks error:", error);
      return; 
    }

    if (tasksData) {
      // student name-г students array-аас авах
      const formattedTasks = tasksData.map((task: any) => ({
        ...task,
        student_name: students.find(s => s.id === task.assigned_to)?.username || "Нэргүй",
      }));

      setTasks(formattedTasks);
      // console.log("Loaded tasks:", formattedTasks);
    }
  } catch (err) {
    console.error("Unexpected error in loadTasks:", err);
  }
};

const assignTask = async () => {
  if (selectedStudents.length === 0) {
    toast({
      title: "Алдаа",
      description: "Суралцагчид сонгоно уу!",
      variant: "destructive",
    });
    return;
  }

  setLoading(true);

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Хэрэглэгч олдсонгүй");

    // ⛔️ Хоосон UUID шалгах
    const validStudents = selectedStudents.filter(id => id && id.trim() !== "");

    if (validStudents.length === 0) {
      toast({
        title: "Алдаа",
        description: "Суралцагчийн ID буруу байна!",
        variant: "destructive",
      });
      return;
    }

    // 🆕 Олон сурагчид нэг дор даалгавар үүсгэх
    const tasksToInsert = validStudents.map(studentId => ({
      title: newTaskTitle,
      category: newTaskCategory,
      points_reward: newTaskPoints,
      assigned_to: studentId,
      assigned_by: user.id,
      deadline: newTaskDeadline || null,
    }));

    const { error } = await supabase
      .from("tasks")
      .insert(tasksToInsert);

    if (error) {
      console.error("Error inserting task:", error);
      toast({
        title: "Алдаа гарлаа",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Амжилттай",
      description: "Даалгавар амжилттай үүсгэлээ",
    });

    // Reset
    setNewTaskTitle("");
    setNewTaskCategory("");
    setNewTaskPoints(10);
    setNewTaskDeadline("");
    setSelectedStudents([]); // ⬅️ Олон сурагч учир
    loadTasks();
  } finally {
    setLoading(false);
  }
};





  const giveReward = async (studentId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("student_rewards").insert({
      student_id: studentId,
      teacher_id: user.id,
      points: rewardPoints,
      comment: rewardComment,
    });

    if (!error) {
      const { data: stats } = await supabase
        .from("user_stats")
        .select("points")
        .eq("user_id", studentId)
        .single();

      await supabase
        .from("user_stats")
        .update({ points: (stats?.points || 0) + rewardPoints })
        .eq("user_id", studentId);

      toast({ title: "Шагнал өгөгдлөө!", description: `${rewardPoints} оноо нэмэгдлээ` });
      setRewardComment("");
      loadStudents();
    }
  };
  const [isDark, setIsDark] = useState(false);
  useEffect(() => {
    const saved = localStorage.getItem("theme");
    const preferDark = saved ? saved === "dark" : window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (preferDark) {
      document.documentElement.classList.add("dark");
      setIsDark(true);
    }
  }, []);
  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };
  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  };

  return (
    <div className="min-h-screen bg-gradient-subtle p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="bg-gradient-magic rounded-3xl p-6 mb-8 shadow-glow-primary">
          <div className="flex items-center gap-3">
            <GraduationCap className="w-8 h-8 text-white" />
            <h1 className="text-3xl font-bold text-white">Багшийн Хяналтын Самбар</h1>
          </div>
          <div className="flex items-center gap-3">
          <Button size="icon" variant="secondary" onClick={toggleTheme} className="rounded-full">
            {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </Button> 
          <Button onClick={handleLogout} variant="outline">
            <LogOut className="w-4 h-4 mr-2" />
            Гарах
          </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <Users className="w-6 h-6 text-primary" />
              <h2 className="text-xl font-bold">Суралцагчид ({students.length})</h2>
            </div>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {students.map((student) => (
                <Card key={student.id} className="p-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-semibold">{student.username}</p>
                      <p className="text-sm text-muted-foreground">анги : { student.class_name}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-primary">{student.points} оноо</p>
                      <Dialog>
                        <DialogTrigger asChild>
                          {/* <Button size="sm" variant="outline" className="mt-2">
                            <Trophy className="w-4 h-4 mr-1" />
                            Шагнах
                          </Button> */}
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Шагнал өгөх - {student.username}</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <Label>Оноо</Label>
                              <Input
                                type="number"
                                value={rewardPoints}
                                onChange={(e) => setRewardPoints(parseInt(e.target.value))}
                                min="1"
                              />
                            </div>
                            <div>
                              <Label>Сэтгэгдэл</Label>
                              <Textarea
                                value={rewardComment}
                                onChange={(e) => setRewardComment(e.target.value)}
                                placeholder="Сайн ажилласан!"
                              />
                            </div>
                            <Button onClick={() => giveReward(student.id)} className="w-full">
                              Шагнал өгөх
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </Card>

          <Card className="p-6">
  <h2 className="text-xl font-bold mb-4">Шинэ Даалгавар Өгөх</h2>

  {/* ----------- Filters ----------- */}
  <div className="grid grid-cols-2 gap-3 mb-4">
    <div>
      <Label>Ангийн шүүлтүүр</Label>
      <Select value={selectedClass} onValueChange={setSelectedClass}>
        <SelectTrigger>
          <SelectValue placeholder="Ангийг сонгох" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Бүх анги</SelectItem>
          <SelectItem value="A">A анги</SelectItem>
          <SelectItem value="B">B анги</SelectItem>
          <SelectItem value="C">C анги</SelectItem>
        </SelectContent>
      </Select>
    </div>

    <div>
      <Label>Хайлт</Label>
      <Input
        placeholder="Нэрээр хайх..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />
    </div>
  </div>

  {/* ----------- Students Checkbox List ----------- */}
  <div className="mb-4 border rounded-lg p-3 max-h-52 overflow-y-auto space-y-2">
    <div className="flex items-center gap-2 mb-2">
      <Checkbox
        checked={selectedStudents.length === filteredStudents.length && filteredStudents.length > 0}
        onCheckedChange={(checked) => {
          if (checked)
            setSelectedStudents(filteredStudents.map(s => s.id));
          else 
            setSelectedStudents([]);
        }}
      />
      <Label className="font-semibold">Бүх сурагчийг сонгох</Label>
    </div>

    {filteredStudents.map((student) => (
      <div key={student.id} className="flex items-center gap-2 p-1 hover:bg-gray-50 rounded">
        <Checkbox
          checked={selectedStudents.includes(student.id)}
          onCheckedChange={() => toggleStudent(student.id)}
        />
        <Label>{student.username} — {student.class_name}</Label>
      </div>
    ))}
  </div>

  {/* ----------- Task Title ----------- */}
  <div className="space-y-3">
    <div>
      <Label>Даалгаврын нэр</Label>
      <Input
        value={newTaskTitle}
        onChange={(e) => setNewTaskTitle(e.target.value)}
        placeholder="Жишээ: 1-р бүлгийг унших"
      />
    </div>

    {/* ----------- Category Select ----------- */}
    <div>
      <Label>Ангилал</Label>
      <Select value={newTaskCategory} onValueChange={setNewTaskCategory}>
        <SelectTrigger>
          <SelectValue placeholder="Ангилал сонгох" />
        </SelectTrigger>
        <SelectContent>
          {categories.map((cat) => (
            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>

    <div>
      <Label>Оноо</Label>
      <Input
        type="number"
        value={newTaskPoints}
        onChange={(e) => setNewTaskPoints(parseInt(e.target.value))}
        min="1"
      />
    </div>

    <div>
      <Label>Дуусах хугацаа</Label>
      <Input
        type="datetime-local"
        value={newTaskDeadline}
        onChange={(e) => setNewTaskDeadline(e.target.value)}
      />
    </div>

    <Button className="w-full" onClick={assignTask}>
      Даалгавар өгөх
    </Button>
  </div>
          </Card>



        </div>

        <Card className="p-6">
          <h2 className="text-xl font-bold mb-4">Өгсөн Даалгаврууд ({tasks.length})</h2>
          <div className="space-y-3">
            {tasks.map((task) => (
              <Card key={task.id} className="p-4">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-semibold">{task.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {task.student_name} • {task.category} • {task.points_reward} оноо {task.deadline ? `• Дуусах: ${new Date(task.deadline).toLocaleDateString()}` : ''}
                    </p>
                  </div>
                  {(() => {
                    const now = Date.now();
                    const deadlineTs = task.deadline ? new Date(task.deadline).getTime() : null;
                    const completedAtTs = task.completed_at ? new Date(task.completed_at).getTime() : null;
                    const onTime = task.completed && deadlineTs && completedAtTs ? completedAtTs <= deadlineTs : false;
                    const isLate = !task.completed && deadlineTs ? now > deadlineTs : false;
                    const badge = task.completed
                    ? onTime
                    ? { text: "✓ Цагтаа", cls: "bg-green-100 text-green-700" }
                    : { text: "✓ Хоцорсон", cls: "bg-orange-100 text-orange-700" }
                    : isLate
                    ? { text: "⏰ Хоцорч байна", cls: "bg-red-100 text-red-700" }
                    : { text: "⏳ Хүлээгдэж байна", cls: "bg-yellow-100 text-yellow-700" };
                    return (
                      <div className={`px-3 py-1 rounded-full text-sm ${badge.cls}`}>
                        {badge.text}
                      </div>
                    );
                  })()}
                </div>
              </Card>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default TeacherDashboard;
