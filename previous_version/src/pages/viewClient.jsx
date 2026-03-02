import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { toast } from "react-toastify";
import { AlertCircle, ArrowLeft, Download } from "lucide-react";
function AttachmentItem({ attachment }) {
  const getFileIcon = (type) => {
    if (type?.includes('pdf')) return '📄';
    if (type?.startsWith('image/')) return '🖼️';
    if (type?.includes('word') || type?.includes('document')) return '📝';
    if (type?.includes('spreadsheet') || type?.includes('excel')) return '📊';
    return '📎';
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };


  return (
    <a
      href={attachment.file_url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors group"
    >
      <div className="flex items-center gap-3">
        <div className="text-2xl">{getFileIcon(attachment.file_type)}</div>
        <div>
          <div className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
            {attachment.file_name}
          </div>
          <div className="text-sm text-gray-500">
            {formatFileSize(attachment.file_size)} • {attachment.file_type?.split('/')[1] || 'File'}
          </div>
        </div>
      </div>
      <Download size={16} className="text-gray-400 group-hover:text-blue-600 transition-colors" />
    </a>
  );
}
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString('en-AU');
  };
    const calculateAge = (dobString) => {
    if (!dobString) return "N/A";
    const dob = new Date(dobString);
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    return age;
  };

function ViewClient() {
  const {id:clientId}=useParams();
  const [client,setClient]=useState({});
  const [loading,setLoading]=useState(false);
    const navigate = useNavigate();
 async   function fetchclient() {
        setLoading(true);
      try {
         const {data,error}=await supabase.from('clients').select("*,file:documents(file_name:document_name,file_url)").eq('id',clientId).single();
         if(error) throw error;
         setClient(data);
      } catch (error) {
        toast.error("failed to get clients error");
      } finally{
        setLoading(false);
      }
    }
    useEffect(()=>{
     if (clientId) {
          fetchclient()
     }   
    },[clientId]);

      if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading client details...</p>
        </div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md p-6 bg-white rounded-lg shadow-lg">
          <AlertCircle className="mx-auto text-red-500" size={48} />
          <h2 className="text-xl font-bold text-gray-900 mt-4">Client Not Found</h2>
          <p className="text-gray-600 mt-2">
            The requested Client could not be found.
          </p>
          <button
            onClick={()=>navigate(-1)}
            className="mt-6 cursor-pointer inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
          Go back
          </button>
        </div>
      </div>
    );
  }

    return <>
    <div className="flex items-center justify-center p-4 min-h-screen bg-gray-50">
          <div className="bg-white border border-gray-200 w-full max-w-2xl ">
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <div className="flex items-center gap-4">
                {client.profile_photo_url ? (
                  <img
                    src={client.profile_photo_url}
                    alt={`${client.first_name} ${client.last_name}`}
                    className="rounded-full h-16 w-16 object-cover border-2 border-gray-200"
                  />
                ) : (
                  <div className="rounded-full h-16 w-16 flex items-center justify-center bg-gradient-to-br from-blue-100 to-blue-200 text-blue-600 font-bold text-xl border-2 border-gray-200">
                    {client.first_name?.[0]}{client.last_name?.[0]}
                  </div>
                )}
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">
                    {client.first_name} {client.last_name}
                  </h2>
                  <p className="text-gray-600">{client.ndis_number}</p>
                </div>
              </div>
              <div className="flex items-center">
                  <button
                    onClick={()=>navigate(-1)} className="flex cursor-pointer hover:text-blue-500">
                   <ArrowLeft/> Back 
                  </button>
              </div>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-2">Personal Information</h3>
                    <div className="space-y-2">
                      <p><span className="font-medium">Age:</span> {calculateAge(client.date_of_birth)}</p>
                      <p><span className="font-medium">DOB:</span> {formatDate(client.date_of_birth)}</p>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-2">Contact Information</h3>
                    <div className="space-y-2">
                      <p><span className="font-medium">Phone:</span> {client.phone_number || 'N/A'}</p>
                      <p><span className="font-medium">Email:</span> {client.email || 'N/A'}</p>
                      <p><span className="font-medium">Address:</span> {client.address_line || 'N/A'}</p>
                      <p>{client.city}, {client.state} {client.postcode}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-2">NDIS Information</h3>
                    <div className="space-y-2">
                      <p><span className="font-medium">Diagnosis:</span> {client.diagnosis || 'Not specified'}</p>
                      <p><span className="font-medium">Goals:</span> {client.goals_summary || 'Not specified'}</p>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-2">Emergency Contacts</h3>
                    <div className="space-y-2">
                      <p><span className="font-medium">Doctor:</span> {client.doctor_name || 'N/A'}</p>
                      <p><span className="font-medium">Doctor Phone:</span> {client.doctor_phone || 'N/A'}</p>
                      <p><span className="font-medium">Next of Kin:</span> {client.next_of_kin_name || 'N/A'}</p>
                      <p><span className="font-medium">Relationship:</span> {client.next_of_kin_relationship || 'N/A'}</p>
                    </div>
                  </div>
                   <div>
                    {
                      client.file && <><h3 className="text-sm font-medium text-gray-500 mb-2">NDIS plan document</h3>
                    <div className="space-y-2">
                       <AttachmentItem attachment={client.file || {}} />
                    </div>
                      </>
                    }
                    
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
    </>
}
export default ViewClient;