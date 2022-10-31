const nodemailer = require('nodemailer')

function transporter() {
    return nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: "ase.project.team.1.section.1@gmail.com",
            pass:  process.env.NODEMAILER_PASSWORD
        },
        host: 'smtp.gmail.com'
    })
}

exports.send_otp = async function (email, otp) {
    const transporterObject = transporter()
    transporterObject.sendMail({
        from:  "ase.project.team.1.section.1@gmail.com",
        to: email,
        subject: "OTP to change password",
        text: otp.toString()
    })
}
