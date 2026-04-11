Embed the reset form in a page
To embed the reset form in a page you can use the next steps.

1. Disable the default implementation
   import SuperTokens from "supertokens-auth-react";
   import EmailPassword from "supertokens-auth-react/recipe/emailpassword";

SuperTokens.init({
appInfo: {
apiDomain: "...",
appName: "...",
websiteDomain: "..."
},
recipeList: [
EmailPassword.init({
resetPasswordUsingTokenFeature: {
disableDefaultUI: true
},
}),
]
});

If you navigate to /auth/reset-password, you should not see the widget anymore.

2. Render the component yourself
   Add the ResetPasswordUsingToken component in your app:

import React from "react";
import {ResetPasswordUsingToken} from 'supertokens-auth-react/recipe/emailpassword/prebuiltui';

class ResetPasswordPage extends React.Component {
render() {
return (
<div>
<ResetPasswordUsingToken/>
</div>
)
}
}


3. Change the website path for reset password UI
   This step is optional. The default path for this is component is /auth/reset-password.

If you are displaying this at some custom path, then you need to add additional configuration on the backend and frontend:

3.1 On the backend
import SuperTokens from "supertokens-node";
import EmailPassword from "supertokens-node/recipe/emailpassword";

SuperTokens.init({
supertokens: {
connectionURI: "...",
},
appInfo: {
apiDomain: "...",
appName: "...",
websiteDomain: "..."
},
recipeList: [
EmailPassword.init({
emailDelivery: {
override: (originalImplementation) => {
return {
...originalImplementation,
sendEmail: async function (input) {
if (input.type === "PASSWORD_RESET") {
return originalImplementation.sendEmail({
...input,
passwordResetLink: input.passwordResetLink.replace(
// This is: `<YOUR_WEBSITE_DOMAIN>/auth/reset-password`
"http://localhost:3000/auth/reset-password",
"http://localhost:3000/your/path"
)
})
}
return originalImplementation.sendEmail(input);
}
}
}
}
})
]
});


3.2 On the frontend
import SuperTokens from "supertokens-auth-react";
import EmailPassword from "supertokens-auth-react/recipe/emailpassword";

SuperTokens.init({
appInfo: {
apiDomain: "...",
appName: "...",
websiteDomain: "...",
},
recipeList: [
EmailPassword.init({

            // The user will be taken to the custom path when they click on forgot password.
            getRedirectionURL: async (context) => {
                if (context.action === "RESET_PASSWORD") {
                    return "/custom-reset-password-path";
                };
            }
        })
    ]
})


Generate a reset link manually
You can use the backend SDK to generate the reset password link as shown below:

import EmailPassword from "supertokens-node/recipe/emailpassword";

async function createResetPasswordLink(userId: string, email: string) {
const linkResponse = await EmailPassword.createResetPasswordLink("public", userId, email);

    if (linkResponse.status === "OK") {
        console.log(linkResponse.link);
    } else {
        // user does not exist or is not an email password user
    }
}


Multy-tenancy
Notice that the first argument to the function call above is "public". This refers to the default tenant ID used in SuperTokens. It means that the generated password reset link can only apply to users belonging to the "public" tenant.

If you are using the multi-tenancy feature, you can pass in the tenantId that contains this user, which you can fetch by getting the user object for this userId.

Finally, the generated link uses the configured websiteDomain from the appInfo object (in supertokens.init), however, you can change the domain of the generated link to match that of the tenant ID.

Change the reset's link lifetime
By default, the password reset link's lifetime is 1 hour. You can change this via a core's configuration (time in milliseconds):

# Here we set the lifetime to 2 hours.

docker run \
-p 3567:3567 \
// highlight-next-line
-e EMAIL_VERIFICATION_TOKEN_LIFETIME=7200000 \
-d supertokens/supertokens-<db_name>

