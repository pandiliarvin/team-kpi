import { useAuth } from "../context/AuthContext";


function Topbar(){

const {user}=useAuth();


return (

<header
className="
bg-white
border-b
px-6
py-4
flex
justify-between
items-center
"
>


<div>

<h2
className="
text-xl
font-semibold
text-gray-800
"
>
Dashboard
</h2>


</div>



<div
className="
text-right
"
>

<p
className="
font-medium
text-gray-800
"
>
{user?.user_metadata?.name || "User"}
</p>


<p
className="
text-sm
text-gray-500
"
>
{user?.email}
</p>


</div>



</header>

)

}


export default Topbar;