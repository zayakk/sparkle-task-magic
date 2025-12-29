import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Button } from "@/components/ui/button";
import { GraduationCap } from "lucide-react";

/* ================= TYPES ================= */
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

/* ================= COMPONENT ================= */
const TeacherReport = () => {
  const [teacherData, setTeacherData] = useState<TeacherTaskReport[]>([]);
  const [studentData, setStudentData] = useState<StudentTaskReport[]>([]);
  const [deadlineData, setDeadlineData] = useState<DeadlineReport[]>([]);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  /* ================= TEACHER REPORT ================= */
  const loadTeacherReport = async () => {
    const { data: tasks } = await supabase
      .from("tasks")
      .select("assigned_by, assigned_to, completed, deadline");

    const { data: teachers } = await supabase
      .from("profiles")
      .select("id, username");

    const { data: students } = await supabase
      .from("profiles")
      .select("id, username");

    if (!tasks || !teachers) {
      setTeacherData([]);
      return;
    }

    const map: Record<string, TeacherTaskReport> = {};

    tasks.forEach((t: any) => {
      if (!t.assigned_by) return;

      const teacher = teachers.find(th => th.id === t.assigned_by);
      if (!teacher) return;

      if (!map[t.assigned_by]) {
        map[t.assigned_by] = {
          teacher_id: t.assigned_by,
          teacher_name: teacher.username,
          task_count: 0,
          overdue_count: 0,
          overdue_students: [],
        };
      }

      map[t.assigned_by].task_count++;

      const isOverdue =
        !t.completed &&
        t.deadline &&
        new Date(t.deadline) < new Date();

      if (isOverdue) {
        const student = students?.find(s => s.id === t.assigned_to);
        if (student) {
          map[t.assigned_by].overdue_count++;
          map[t.assigned_by].overdue_students.push(student.username);
        }
      }
    });

    setTeacherData(Object.values(map));
  };

  /* ================= STUDENT REPORT ================= */
  const loadStudentReport = async () => {
    const { data: tasks } = await supabase
      .from("tasks")
      .select("assigned_to, completed, deadline");

    const { data: students } = await supabase
      .from("profiles")
      .select("id, username");

    if (!tasks || !students) {
      setStudentData([]);
      return;
    }

    const map: Record<string, StudentTaskReport> = {};

    tasks.forEach((t: any) => {
      const student = students.find(s => s.id === t.assigned_to);
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

      map[t.assigned_to].total_tasks++;

      if (t.completed) map[t.assigned_to].completed_tasks++;
      else if (t.deadline && new Date(t.deadline) < new Date())
        map[t.assigned_to].overdue_tasks++;
    });

    setStudentData(Object.values(map));
  };

  /* ================= DEADLINE REPORT (FIXED) ================= */
  const loadDeadlineReport = async () => {
    const { data: tasks } = await supabase
      .from("tasks")
      .select("completed, deadline");

    if (!tasks || tasks.length === 0) {
      // 🔒 empty хамгаалалт
      setDeadlineData([
        { name: "Дууссан", value: 0 },
        { name: "Идэвхтэй", value: 0 },
        { name: "Хоцорсон", value: 0 },
      ]);
      return;
    }

    let completed = 0;
    let active = 0;
    let overdue = 0;

    const now = new Date();

    tasks.forEach((t: any) => {
      if (t.completed) completed++;
      else if (t.deadline && new Date(t.deadline) < now) overdue++;
      else active++;
    });

    setDeadlineData([
      { name: "Дууссан", value: completed },
      { name: "Идэвхтэй", value: active },
      { name: "Хоцорсон", value: overdue },
    ]);
  };

  /* ================= LOAD ALL ================= */
  useEffect(() => {
    setLoading(true);
    Promise.all([
      loadTeacherReport(),
      loadStudentReport(),
      loadDeadlineReport(),
    ]).finally(() => setLoading(false));
  }, []);

  /* ================= UI ================= */
  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <GraduationCap className="w-8 h-8 text-primary" />
        <h1 className="text-3xl font-bold">Тайлан</h1>
        <Button onClick={() => navigate("/teacher")} className="ml-auto">
          Буцах
        </Button>
      </div>

      {loading && <p>Татаж байна...</p>}

      {/* ===== TEACHER BAR ===== */}
      <Card className="p-4 mb-6 h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={teacherData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="teacher_name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="task_count" fill="#4f46e5" name="Нийт" />
            <Bar dataKey="overdue_count" fill="#dc2626" name="Хоцорсон" />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* ===== STUDENT BAR ===== */}
      <Card className="p-4 mb-6 h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={studentData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="student_name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="total_tasks" fill="#6366f1" />
            <Bar dataKey="completed_tasks" fill="#16a34a" />
            <Bar dataKey="overdue_tasks" fill="#dc2626" />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* ===== DEADLINE PIE (100% SHOW) ===== */}
      <Card className="p-4 h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={deadlineData}
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
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
};

export default TeacherReport;
