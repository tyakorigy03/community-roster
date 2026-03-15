import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./App.css";
import Login from "./pages/login";
import Onboarding from "./pages/onboarding";
import Terms from "./pages/terms";
import Privacy from "./pages/privacy";
import Layout from "./components/layout";
import Index from "./pages";
import StaffsPage from "./pages/staff";
import AddStaff from "./pages/addstaff";
import Shifts from "./pages/shifts";
import ShiftHistory from "./pages/ShiftHistory";
import AddShift from "./pages/addshift";
import AddClient from "./pages/addclient";
import ClientsPage from "./pages/clients";
import EditClient from "./pages/editclient";
import HierarchyPage from "./pages/hierachy";
import AddHierarchy from "./pages/addhiearchy";
import EditHierarchy from "./pages/edithierachy";
import IncidentsList from "./pages/incidencelist";
import AddIncident from "./pages/addincident";
import AddProgressNote from "./pages/addprogressnote";
import StaffCalendar from "./pages/calender";
import ProgressNotesList from "./pages/progressnote";
import ProgressNoteDetail from "./pages/viewProgressnotes";
import EditProgressNote from "./pages/editprogressnote";
import EditIncident from "./pages/editincidence";
import ViewIncident from "./pages/viewncident";
import PayrollPage from "./pages/payroll";
import SettingsPage from "./pages/setting";
import ClockInOutPage from "./pages/clock";
import PayRateManagement from "./pages/managepayrollrate";
import EditStaff from "./pages/editstaff";
import ViewClient from "./pages/viewClient";
import StaffProfile from "./pages/profilepage";
function App() {
  return (
    <>
      <BrowserRouter>
        <>
          <Routes>
            <Route index element={<Layout><Index /></Layout>} />
            <Route path="/staff" element={<Layout><StaffsPage /></Layout>} />
            <Route path="/calender" element={<Layout><StaffCalendar /></Layout>} />
            <Route path="/addstaff" element={<AddStaff />} />
            <Route path="/edit-staff/:id" element={<EditStaff />} />
            <Route path="/shifts" element={<Layout><Shifts /></Layout>} />
            <Route path="/shift-history" element={<Layout><ShiftHistory /></Layout>} />
            <Route path="/shifts/add" element={<Layout><AddShift /></Layout>} />
            <Route path="/clients" element={<Layout><ClientsPage /></Layout>} />
            <Route path="/view-client/:id" element={<ViewClient />} />
            <Route path="/addclient" element={<AddClient />} />
            <Route path="/edit-client/:id" element={<EditClient />} />
            <Route path="/hierarchy" element={<Layout><HierarchyPage /></Layout>} />
            <Route path="/add-hierarchy" element={<AddHierarchy />} />
            <Route path="/edit-hierarchy" element={<EditHierarchy />} />
            <Route path="/incidents" element={<Layout><IncidentsList /></Layout>} />
            <Route path="/incidents/:id" element={<ViewIncident />} />
            <Route path="/add-incident" element={<AddIncident />} />
            <Route path="/edit-incident/:id" element={<EditIncident />} />
            <Route path="/progress-notes" element={<Layout><ProgressNotesList /></Layout>} />
            <Route path="/progress-notes/:id" element={<ProgressNoteDetail />} />
            <Route path="/add-progressnote" element={<AddProgressNote />} />
            <Route path="/edit-progressnote/:id" element={<EditProgressNote />} />
            <Route path="/payroll" element={<Layout><PayrollPage /></Layout>} />
            <Route path="/payroll/rates" element={<Layout><PayRateManagement /></Layout>} />
            <Route path="/settings" element={<Layout><SettingsPage /></Layout>} />
            <Route path="/clock_in_out/:shift_id/:staff_id" element={<Layout><ClockInOutPage /></Layout>} />
            <Route path="/profile" element={<Layout><StaffProfile /></Layout>} />
            <Route path="/login" element={<Login />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="*" element={<div>Page Not Found</div>} />
          </Routes>
        </>
      </BrowserRouter>
    </>

  );
}

export default App;
