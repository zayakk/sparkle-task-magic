import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { useNavigate } from "react-router-dom"; // navigation
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
  Cell,
  Pie,
} from "recharts";
import { Button } from "@/components/ui/button";
import { GraduationCap, PieChart } from "lucide-react";

interface TeacherTaskReport {
  teacher_id: string;
  teacher_name: string;
  task_count: number;
  overdue_count: number;
  overdue_students: string[]; 
}
interface StudentTaskReport {
  student_id: string;
  student_name: string;
  total_tasks: number;
  completed_tasks: number;
  overdue_tasks: number;
}

interface DeadlineReport {
  name: string;
  value: number;
}
const [teacherData, setTeacherData] = useState<TeacherTaskReport[]>([]);
const [studentData, setStudentData] = useState<StudentTaskReport[]>([]);
const [deadlineData, setDeadlineData] = useState<DeadlineReport[]>([]);
const TeacherReport = () => {
    const [data, setData] = useState<TeacherTaskReport[]>([]);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate(); 

  const loadReport = async () => {
    setLoading(true);
    try {
      // 1️⃣ Бүх даалгаврыг авах
      const { data: tasks, error: tasksError } = await supabase
        .from("tasks")
        .select("id, assigned_by, assigned_to, completed, deadline")
      if (tasksError) throw tasksError;

      if (!tasks || tasks.length === 0) {
        setData([]);
        return;
      }
const loadDeadlineReport = async () => {
  const { data: tasks } = await supabase
    .from("tasks")
    .select("completed, deadline");

  let completed = 0;
  let active = 0;
  let overdue = 0;

  const now = new Date();

  tasks?.forEach((t: any) => {
    if (t.completed) completed++;
    else if (t.deadline && new Date(t.deadline) < now) overdue++;
    else active++;
  });

  setData([
    { name: "Дууссан", value: completed },
    { name: "Идэвхтэй", value: active },
    { name: "Хоцорсон", value: overdue },
  ]);
};


const loadStudentReport = async () => {
  setLoading(true);
  try {
    const { data: tasks } = await supabase
      .from("tasks")
      .select("assigned_to, completed, deadline");

    const { data: students } = await supabase
      .from("profiles")
      .select("id, username");

    const map: Record<string, StudentTaskReport> = {};

    tasks?.forEach((t: any) => {
      const student = students?.find(s => s.id === t.assigned_to);
      if (!student) return;

      if (!map[t.assigned_to]) {
        map[t.assigned_to] = {
          student_id: t.assigned_to,
          student_name: student.username,
          total_tasks: 0,
          completed_tasks: 0,
          overdue_tasks: 0,
        };
      }

      map[t.assigned_to].total_tasks += 1;

      if (t.completed) {
        map[t.assigned_to].completed_tasks += 1;
      } else if (t.deadline && new Date(t.deadline) < new Date()) {
        map[t.assigned_to].overdue_tasks += 1;
      }
    });

    setData(Object.values(map));
  } finally {
    setLoading(false);
  }
};

      // Багшийн мэдээллийг авах
const { data: teachers, error: teachersError } = await supabase
  .from("profiles")
  .select("id, username");

if (teachersError) throw teachersError;

// Сурагчдын мэдээллийг авах
const { data: students, error: studentsError } = await supabase
  .from("profiles")
  .select("id, username");

if (studentsError) throw studentsError;

// Дараа нь tasks-ийг өөрөө map хийж report үүсгэх
const reportMap: Record<string, TeacherTaskReport> = {};

tasks.forEach((t: any) => {
  const teacher = teachers?.find(th => th.id === t.assigned_by);
  const teacherName = teacher?.username || "Нэргүй";

  if (!reportMap[t.assigned_by]) {
    reportMap[t.assigned_by] = {
      teacher_id: t.assigned_by,
      teacher_name: teacherName,
      task_count: 0,
      overdue_count: 0,
      overdue_students: [],
    };
  }

  reportMap[t.assigned_by].task_count += 1;

  const now = Date.now();
  const deadlineTs = t.deadline ? new Date(t.deadline).getTime() : null;
  const isOverdue = !t.completed && deadlineTs && now > deadlineTs;

  if (isOverdue) {
    const student = students?.find(s => s.id === t.assigned_to);
    if (student) {
      reportMap[t.assigned_by].overdue_count += 1;
      reportMap[t.assigned_by].overdue_students.push(student.username);
    }
  }
});

setData(Object.values(reportMap));

    } catch (err) {
      console.error("Load report error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, []);

  return (
    <div className="p-6 max-w-5xl mx-auto">        
        <div className="flex items-center gap-3">
        <GraduationCap className="w-8 h-8 text-primary" />
        <h1 className="text-3xl font-bold text-primary">Багшийн даалгаврын тайлан</h1>
        <Button onClick={() => navigate("/teacher")} className="ml-auto">
        Буцах
        </Button>
        </div>
        <br />
      {loading ? (
        <p>Татаж байна...</p>
      ) : data.length === 0 ? (
        <p>Мэдээлэл олдсонгүй</p>
      ) : (
        <>
          <Card className="p-4 mb-6 bg-purple-100 rounded-lg shadow-sm">
            <div style={{ width: "100%", height: 400 }}>
                <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="teacher_name" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="task_count" fill="#71246f" name="Нийт даалгавар" />
                    <Bar dataKey="overdue_count" fill="#c90076" name="Хугацаа хэтэрсэн" />
                </BarChart>
                </ResponsiveContainer>
            </div>
        </Card>


          {/* Хугацаа хэтэрсэн сурагчдын нэрсийг жагсаалт */}
          {data.map((t) => (
            <Card key={t.teacher_id} className="p-4 mb-3 bg-purple-100 rounded-lg shadow-sm">
            <h3 className="font-bold text-lg mb-2">{t.teacher_name} - Хугацаа хэтэрсэн даалгавруудтай сурагчид</h3>
            {t.overdue_students.length > 0 ? (
                <ul className="list-disc list-inside text-blue-600">
                {t.overdue_students.map((s, idx) => (
                    <li key={idx}>{s}</li>
                ))}
                </ul>
            ) : (
                <p className="text-green-600">Хугацаа хэтэрсэн даалгавар алга</p>
            )}
            </Card>

          ))}
        </>
      )}
<ResponsiveContainer width="100%" height={400}>
  <BarChart data={data}>
    <CartesianGrid strokeDasharray="3 3" />
    <XAxis dataKey="student_name" />
    <YAxis allowDecimals={false} />
    <Tooltip />
    <Legend />
    <Bar dataKey="total_tasks" fill="#4f46e5" name="Нийт" />
    <Bar dataKey="completed_tasks" fill="#16a34a" name="Дууссан" />
    <Bar dataKey="overdue_tasks" fill="#dc2626" name="Хоцорсон" />
  </BarChart>
</ResponsiveContainer>

<ResponsiveContainer width="100%" height={350}>
  <PieChart>
    <Pie
      data={data}
      dataKey="value"
      nameKey="name"
      cx="50%"
      cy="50%"
      outerRadius={120}
      label
    >
      <Cell fill="#16a34a" />
      <Cell fill="#3b82f6" />
      <Cell fill="#dc2626" />
    </Pie>
    <Tooltip />
  </PieChart>
</ResponsiveContainer>

    </div>
  );
};

export default TeacherReport;
