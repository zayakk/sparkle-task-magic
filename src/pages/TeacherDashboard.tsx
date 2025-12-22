import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client"; // Supabase client
import { useNavigate } from "react-router-dom"; // navigation
import { useToast } from "@/hooks/use-toast"; // toast мэдэгдэл
import { Button } from "@/components/ui/button"; // button
import { Card } from "@/components/ui/card"; // card
import { Input } from "@/components/ui/input"; // input
import { Label } from "@/components/ui/label"; // label
import { Textarea } from "@/components/ui/textarea"; // textarea
import { Checkbox } from "@/components/ui/checkbox"; // checkbox
import { GraduationCap, LogOut, Moon, Plus, Sun, Trophy, Users } from "lucide-react"; // icons
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

// Суралцагчийн мэдээлэл
interface Student {
  id: string;
  username: string;
  class_name: string;
  points: number;
}

// Даалгаврын мэдээлэл
interface Task {
  id: string;
  title: string;
  category: string;
  completed: boolean;
  assigned_to: string;
  student_id: string;   
  student_name: string;
  points_reward: number;
  deadline?: string;
  completed_at?: string;
}

const TeacherDashboard = () => {
  const { toast } = useToast();
  const navigate = useNavigate();

  // State-ууд
  const [students, setStudents] = useState<Student[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [groups, setGroups] = useState<any[]>([]); // Group, group_members хамт
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [selectedGroup, setSelectedGroup] = useState("none");
  const [newGroupName, setNewGroupName] = useState("");
  const [groupStudents, setGroupStudents] = useState<string[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskCategory, setNewTaskCategory] = useState("");
  const [newTaskPoints, setNewTaskPoints] = useState(10);
  const [newTaskDeadline, setNewTaskDeadline] = useState("");
  const [rewardPoints, setRewardPoints] = useState(10);
  const [rewardComment, setRewardComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClass, setSelectedClass] = useState("all");
  const [isDark, setIsDark] = useState(false);
  const [tasksOpen, setTasksOpen] = useState(true); // task list нээх/хаах

  // Ангилалуудын жагсаалт
  const categories = ["Бүтээлт", "Өгөгдлийн сан", "Төсөл", "Мат", "Программчлал"];

  // ------------ Supabase-аас мэдээлэл авах функцууд ------------

  // Суралцагчдын мэдээлэл ачааллах
  const loadStudents = async () => {
    try {
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .eq("is_teacher", false);
      if (profilesError) throw profilesError;

      const { data: statsData, error: statsError } = await supabase
        .from("user_stats")
        .select("*");
      if (statsError) throw statsError;

      const studentsWithPoints = profilesData?.map(profile => ({
        id: profile.id,
        username: profile.username || "Нэргүй",
        class_name: profile.class_name || "",
        points: statsData?.find(s => s.user_id == profile.id)?.points || 0,
      })) || [];

      setStudents(studentsWithPoints);
    } catch (err) {
      console.error("Error loading students:", err);
    }
  };

  // Даалгавруудыг ачааллах
  const loadTasks = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: tasksData, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("assigned_by", user.id)
        .order("created_at", { ascending: false });

      if (error) return console.error("Load tasks error:", error);

      const formattedTasks = tasksData?.map((task: any) => ({
        ...task,
        student_name: students.find(s => s.id === task.assigned_to)?.username || "Нэргүй",
      }));

      setTasks(formattedTasks || []);
    } catch (err) {
      console.error("Unexpected error in loadTasks:", err);
    }
  };

  // Группуудыг ачааллах
  const loadGroups = async () => {
    const userResp = await supabase.auth.getUser();
    const user = userResp.data?.user;
    if (!user) return;

    const { data: groupsData, error } = await supabase
      .from("groups")
      .select(`
        id,
        name,
        group_members!group_members_group_id_fkey (
          student_id,
          profiles (
            id,
            username,
            class_name
          )
        )
      `)
      .eq("teacher_id", user.id);

    if (error) return console.error("LOAD GROUPS ERROR:", error);

    setGroups(groupsData || []);
  };

  // ------------ Event / Handler функцууд ------------

  // Нэг сурагч сонгох/арилгах
  const toggleStudent = (id: string) => {
    setSelectedStudents(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  // Бүгдийг сонгох / арилгах
  const toggleSelectAll = () => {
    if (selectedStudents.length === students.length) setSelectedStudents([]);
    else setSelectedStudents(students.map(s => s.id));
  };

  // Баг доторх сурагч сонгох
  const toggleGroupStudent = (id: string) => {
    setGroupStudents(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  // Даалгавар өгөх
  const assignTask = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let studentIds: string[] = [];
      if (selectedGroup !== "none") {
        const { data: members, error } = await supabase
          .from("group_members")
          .select("student_id")
          .eq("group_id", selectedGroup);
        if (!members || members.length === 0) {
          toast({ title: "Алдаа", description: "Энэ группт сурагч алга байна", variant: "destructive" });
          return;
        }
        studentIds = members.map(m => m.student_id);
      } else {
        studentIds = selectedStudents;
      }

      if (!newTaskTitle.trim()) {
        toast({ title: "Алдаа", description: "Даалгаврын нэр оруулна уу!", variant: "destructive" });
        return;
      }

      if (studentIds.length === 0) {
        toast({ title: "Алдаа", description: "Суралцагчид сонгоно уу!", variant: "destructive" });
        return;
      }

      const tasksToInsert = studentIds.map(studentId => ({
        title: newTaskTitle,
        category: newTaskCategory,
        points_reward: newTaskPoints,
        assigned_to: studentId,
        assigned_by: user.id,
        assigned_group: selectedGroup !== "none" ? selectedGroup : null,
        deadline: newTaskDeadline || null,
      }));

      const { error } = await supabase.from("tasks").insert(tasksToInsert);
      if (error) throw error;

      toast({ title: "Амжилттай", description: "Даалгавар амжилттай үүсгэлээ" });
      setNewTaskTitle(""); setNewTaskCategory(""); setNewTaskPoints(10); setNewTaskDeadline("");
      setSelectedStudents([]); setSelectedGroup("none");
      loadTasks();
    } catch (err) {
      toast({ title: "Алдаа гарлаа", description: (err as any).message, variant: "destructive" });
    } finally { setLoading(false); }
  };

  // Баг үүсгэх
  const createGroup = async () => {
    if (!newGroupName.trim()) return toast({ title: "Алдаа", description: "Группийн нэр оруулна уу", variant: "destructive" });
    if (groupStudents.length === 0) return toast({ title: "Алдаа", description: "Ядаж 1 сурагч сонгоно уу", variant: "destructive" });

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: group, error } = await supabase
      .from("groups")
      .insert({ name: newGroupName, teacher_id: user.id })
      .select().single();
    if (error) return toast({ title: "Алдаа", description: error.message, variant: "destructive" });

    const members = groupStudents.map(studentId => ({ group_id: group.id, student_id: studentId }));
    const { error: membersError } = await supabase.from("group_members").insert(members);
    if (membersError) return toast({ title: "Алдаа", description: membersError.message, variant: "destructive" });

    toast({ title: "Амжилттай", description: "Баг амжилттай үүслээ" });
    setNewGroupName(""); setGroupStudents([]);
    loadGroups();
  };

  // Сурагчдад шагнал өгөх
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
      const { data: stats } = await supabase.from("user_stats").select("points").eq("user_id", studentId).single();
      await supabase.from("user_stats").update({ points: (stats?.points || 0) + rewardPoints }).eq("user_id", studentId);
      toast({ title: "Шагнал өгөгдлөө!", description: `${rewardPoints} оноо нэмэгдлээ` });
      setRewardComment(""); loadStudents();
    }
  };

  // Theme болон Logout
  useEffect(() => {
    const saved = localStorage.getItem("theme");
    const preferDark = saved ? saved === "dark" : window.matchMedia?.('(prefers-color-scheme: dark)')?.matches;
    if (preferDark) { document.documentElement.classList.add("dark"); setIsDark(true); }
  }, []);
  const handleLogout = async () => { await supabase.auth.signOut(); navigate("/auth"); };
  const toggleTheme = () => { const next = !isDark; setIsDark(next); document.documentElement.classList.toggle("dark", next); localStorage.setItem("theme", next ? "dark" : "light"); };

  // Filtered students
  const filteredStudents = students.filter(s => (selectedClass === "all" || s.class_name === selectedClass) && s.username.toLowerCase().includes(searchTerm.toLowerCase()));

  // ------------ useEffect ------------

  useEffect(() => {
    loadStudents();
    loadTasks();
    loadGroups();
    const channel = supabase.channel("teacher-tasks-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, () => { loadTasks(); loadStudents(); })
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-subtle p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="bg-gradient-magic rounded-3xl p-6 mb-8 shadow-glow-primary">
          <div className="flex items-center gap-3">
            <GraduationCap className="w-8 h-8 text-white" />
            <h1 className="text-3xl font-bold text-white">Багшийн Хяналтын Самбар</h1>
            <Button onClick={() => navigate("/report")} className="ml-auto">
              Даалгаврын тайлан үзэх
            </Button>
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
                      {/* <p className="font-bold text-primary">{student.points} оноо</p> */}
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
          <SelectItem value="PH4">ПХ-4 анги</SelectItem>
          <SelectItem value="1a">1a анги</SelectItem>
          <SelectItem value="а">а анги</SelectItem>
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

{/* ----------- Group Select ----------- */}
      <div className={`mb-4 border rounded-lg p-3 max-h-52 overflow-y-auto space-y-2 
        ${selectedGroup !== "none" ? "opacity-50 pointer-events-none" : ""}`}
      >
        <Label>Баг сонгох</Label>

        <Select
          value={selectedGroup}
          onValueChange={(value) => {
            setSelectedGroup(value);
            if (value !== "none") {
              setSelectedStudents([]);
            }
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Баг сонгох" />
          </SelectTrigger>

          <SelectContent>
            <SelectItem value="none">— Сонгохгүй —</SelectItem>

            {groups.map(g => (
              <SelectItem key={g.id} value={g.id}>
                {g.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

 <br /> 

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
        <Card className="p-6 mb-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Үүсгэсэн багууд</h2>

            <Dialog>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Баг үүсгэх
                </Button>
              </DialogTrigger>

              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Шинэ баг үүсгэх</DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                  {/* Group name */}
                  <div>
                    <Label>Группийн нэр</Label>
                    <Input
                      value={newGroupName}
                      onChange={(e) => setNewGroupName(e.target.value)}
                      placeholder="Жишээ: 10A – Программчлал"
                    />
                  </div>

                  {/* Students */}
                  <div className="border rounded p-3 max-h-60 overflow-y-auto space-y-2">
                    {students.map((s) => (
                      <div
                        key={s.id}
                        className="flex items-center gap-2 p-1 rounded hover:bg-muted"
                      >
                        <Checkbox
                          checked={groupStudents.includes(s.id)}
                          onCheckedChange={() => toggleGroupStudent(s.id)}
                        />
                        <Label>
                          {s.username} — {s.class_name}
                        </Label>
                      </div>
                    ))}
                  </div>

                  <Button className="w-full" onClick={createGroup}>
                    x үүсгэх
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Group list */}
          <div className="space-y-3">
            {groups.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Одоогоор баг алга байна
              </p>
            )}

            {groups.map((group) => (
              <Card key={group.id} className="p-4">
                <h3 className="font-bold text-lg mb-2">{group.name}</h3>

                <div className="space-y-1">
                  {group.group_members.map((m) => (
                    <div
                      key={m.student_id}
                      className="text-sm text-muted-foreground"
                    >
                      • {m.profiles.username} ({m.profiles.class_name})
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        </Card>



        <Card className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">
              Өгсөн Даалгаврууд ({tasks.length})
            </h2>
            {/* Toggle button */}
            <Button 
              size="icon" 
              variant="outline" 
              onClick={() => setTasksOpen(prev => !prev)}
            >
              {tasksOpen ? "▾" : "▸"} {/* arrow icon эсвэл text */}
            </Button>
          </div>

          {/* Task list */}
          {tasksOpen && (
            <div className="space-y-3">
              {tasks.map((task) => (
                <Card key={task.id} className="p-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-semibold">{task.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {task.student_name} • {task.category} • {task.points_reward} оноо
                        {task.deadline ? ` • Дуусах: ${new Date(task.deadline).toLocaleDateString()}` : ''}
                      </p>
                    </div>
                    {/* Статус */}
                    <div>
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
                  </div>
                </Card>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default TeacherDashboard;
