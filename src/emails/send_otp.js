\/**
 * @author Naveen
 */

/**
 * import nodemailer library
 */
const nodemailer = require('nodemailer')

/**
 * 
 * @returns nodemailer
 */
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

/**
 * Send otp to user email
 * @param {*} email email address
 * @param {*} otp value to send
 */
exports.send_otp = async function (email, otp) {
    const transporterObject = transporter()
    transporterObject.sendMail({
        from:  "ase.project.team.1.section.1@gmail.com",
        to: email,
        subject: "OTP to change password",
        text: otp.toString()
    })
}
