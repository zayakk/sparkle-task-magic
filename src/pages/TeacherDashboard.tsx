import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { GraduationCap, LogOut, Plus, Trophy, Users } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

interface Student {
  id: string;
  display_name: string;
  class_name: string;
  points: number;
}

interface Task {
  id: string;
  title: string;
  category: string;
  completed: boolean;
  assigned_to: string;
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
    const { data: rolesData } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "student");

    if (rolesData) {
      const userIds = rolesData.map(r => r.user_id);
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, display_name, class_name")
        .in("id", userIds);

      const { data: statsData } = await supabase
        .from("user_stats")
        .select("user_id, points")
        .in("user_id", userIds);

      if (profilesData && statsData) {
        const studentsWithPoints = profilesData.map(profile => ({
          id: profile.id,
          display_name: profile.display_name || "Нэргүй",
          class_name: profile.class_name || "",
          points: statsData.find(s => s.user_id === profile.id)?.points || 0,
        }));
        setStudents(studentsWithPoints);
      }
    }
  };

  const loadTasks = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("tasks")
      .select(`
        id,
        title,
        category,
        completed,
        assigned_to,
        points_reward,
        deadline,
        completed_at,
        profiles!tasks_assigned_to_fkey(display_name)
      `)
      .eq("assigned_by", user.id)
      .order("created_at", { ascending: false });

    if (data) {
      const formattedTasks = data.map(task => ({
        ...task,
        student_name: (task.profiles as any)?.display_name || "Нэргүй",
      }));
      setTasks(formattedTasks);
    }
  };

  const assignTask = async () => {
    if (!selectedStudent || !newTaskTitle) {
      toast({ title: "Алдаа", description: "Бүх талбарыг бөглөнө үү", variant: "destructive" });
      return;
    }

    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("tasks").insert({
      title: newTaskTitle,
      category: newTaskCategory || "Ерөнхий",
      color: "#9b87f5",
      user_id: selectedStudent,
      assigned_by: user.id,
      assigned_to: selectedStudent,
      points_reward: newTaskPoints,
      completed: false,
    });

    if (error) {
      toast({ title: "Алдаа", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Амжилттай!", description: "Даалгавар өгөгдлөө" });
      setNewTaskTitle("");
      setNewTaskCategory("");
      setSelectedStudent("");
      loadTasks();
    }
    setLoading(false);
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
  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  return (
    <div className="min-h-screen bg-gradient-subtle p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="bg-gradient-magic rounded-3xl p-6 mb-8 shadow-glow-primary">
          <div className="flex items-center gap-3">
            <GraduationCap className="w-8 h-8 text-white" />
            <h1 className="text-3xl font-bold text-white">Багшийн Хяналтын Самбар</h1>
          </div>
          <Button onClick={handleLogout} variant="outline">
            <LogOut className="w-4 h-4 mr-2" />
            Гарах
          </Button>
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
                      <p className="font-semibold">{student.display_name}</p>
                      <p className="text-sm text-muted-foreground">{student.class_name}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-primary">{student.points} оноо</p>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button size="sm" variant="outline" className="mt-2">
                            <Trophy className="w-4 h-4 mr-1" />
                            Шагнах
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Шагнал өгөх - {student.display_name}</DialogTitle>
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
            <div className="flex items-center gap-3 mb-4">
              <Plus className="w-6 h-6 text-primary" />
              <h2 className="text-xl font-bold">Шинэ Даалгавар Өгөх</h2>
            </div>
            <div className="space-y-4">
              <div>
                <Label>Суралцагч сонгох</Label>
                <Select value={selectedStudent} onValueChange={setSelectedStudent}>
                  <SelectTrigger>
                    <SelectValue placeholder="Суралцагч сонгоно уу" />
                  </SelectTrigger>
                  <SelectContent>
                    {students.map((student) => (
                      <SelectItem key={student.id} value={student.id}>
                        {student.display_name} - {student.class_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Даалгаврын нэр</Label>
                <Input
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="Математик хичээл хийх"
                />
              </div>
              <div>
                <Label>Ангилал</Label>
                <Input
                  value={newTaskCategory}
                  onChange={(e) => setNewTaskCategory(e.target.value)}
                  placeholder="Математик"
                />
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
              <Button onClick={assignTask} disabled={loading} className="w-full">
                {loading ? "Түр хүлээнэ үү..." : "Даалгавар өгөх"}
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
                        : { text: "⏳ Хүлээгдэж", cls: "bg-yellow-100 text-yellow-700" };
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
