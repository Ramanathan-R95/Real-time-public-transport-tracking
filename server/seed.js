require('dotenv').config();
const mongoose = require('mongoose');
const Driver = require('./models/Driver');
const Route = require('./models/Route');
const Admin  = require('./models/Admin');
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('MongoDB connected');

  // --- Seed Routes ---
  const existingRoute = await Route.findOne({ routeNumber: 'R1' });
  let route1;



   const existingAdmin = await Admin.findOne({ email: 'admin@campustrack.com' });
  if (!existingAdmin) {
    await Admin.create({
      name: 'Campus Admin',
      email: 'admin@campustrack.com',
      password: 'admin123',
    });
    console.log('Admin created');
  } else {
    console.log('Admin already exists');
  }


  if (existingRoute) {
    console.log('Routes already exist, skipping route seed.');
    route1 = existingRoute;
  } else {
    route1 = await Route.create({
      routeName: 'Chathiram to M.A.M college of Engineering',
      routeNumber: 'R1',
      isActive: true,
      stops: [   
                {
                "name": "Chatram Bus Stand",
                "lat": 10.830750992756508,
                "lng": 78.69332902847191,
                "order": 1
              },



                {
                  "name": "East Chinthamani",
                  "lat": 10.848148302781725,
                  "lng": 78.69927806452736,
                  "order": 1
                },
                {
                  "name": "Srirangam",
                  "lat": 10.852887170505394,
                  "lng": 78.7005143174712,
                  "order": 2
                },
                {
                  "name": "No 1 Tollgate",
                  "lat": 10.874917605641809,
                  "lng": 78.70796561733142,
                  "order": 3
                },
                {
                  "name": "Koothur",
                  "lat": 10.886092508455052,
                  "lng": 78.71746736411737,
                  "order": 4
                },
                {
                  "name": "Palur",
                  "lat": 10.892666457791158,
                  "lng": 78.72183205620001,
                  "order": 5
                },
                {
                  "name": "Samayapuram Bus Stop",
                  "lat": 10.919623777787491,
                  "lng": 78.73398344112292,
                  "order": 6
                },
                {
                  "name": "Samayapuram Toll Plaza",
                  "lat": 10.929403303379855,
                  "lng": 78.74398285283102,
                  "order": 7
                },
                {
                  "name": "Trichy SRM Medical College & Hospital",
                  "lat": 10.953689818848904,
                  "lng": 78.75865742220368,
                  "order": 8
                },
                {
                  "name": "MAM College of Engineering",
                  "lat": 10.99359685062305,
                  "lng": 78.78117406351589,
                  "order": 9
                }
              ],
    });

    await Route.create({
      routeName: 'Chathiram to NIT',
      routeNumber: 'R2',
      isActive: true,
      stops:[
              {
                "name": "Chatram Bus Stand",
                "lat": 10.830750992756508,
                "lng": 78.69332902847191,
                "order": 1
              },
              {
                "name": "Rockfort",
                "lat": 10.827103129822135,
                "lng": 78.69299254286679,
                "order": 2
              },
              {
                "name": "Tiruchirappalli Junction",
                "lat": 10.79538845244993,
                "lng": 78.68417880463657,
                "order": 3
              },
              {
                "name": "Tiruchirappalli Central Bus Stand",
                "lat": 10.798232403124782,
                "lng": 78.68071993768058,
                "order": 4
              },
              {
                "name": "TVS Toll Gate",
                "lat": 10.789213106871545,
                "lng": 78.69672284971487,
                "order": 5
              },
              {
                "name": "BHEL Township / Kailasapuram",
                "lat": 10.774307165414019,
                "lng": 78.79189494315477,
                "order": 6
              },
              {
                "name": "Thuvakudimalai",
                "lat": 10.767897069677199,
                "lng": 78.80024739302935,
                "order": 7
              },
              {
                "name": "NIT Main Gate",
                "lat": 10.756848408782085,
                "lng": 78.8132223643955,
                "order": 8
              }
            ],
    });

    await Route.create({
      routeName: 'Parking to Sports Complex',
      routeNumber: 'R3',
      isActive: true,
      stops: [
        { name: 'Parking Area',        lat: 10.9130, lng: 78.8510, order: 1 },
        { name: 'Medical Centre',      lat: 10.9142, lng: 78.8525, order: 2 },
        { name: 'Auditorium',          lat: 10.9158, lng: 78.8540, order: 3 },
        { name: 'Sports Complex',      lat: 10.9175, lng: 78.8558, order: 4 },
      ],
    });

    console.log('3 routes created successfully.');
  }

  // --- Seed Driver ---
  const existingDriver = await Driver.findOne({ email: 'driver@test.com' });

  if (existingDriver) {
    console.log('Driver already exists, skipping driver seed.');
  } else {
    await Driver.create({
      name: 'Test Driver',
      email: 'driver@test.com',
      password: 'password123',
      vehicleNumber: 'TN-01-AB-1234',
      assignedRoute: route1._id,
    });
    console.log('Driver created successfully.');
  }

  console.log('\n--- Login Credentials ---');
  console.log('Email:    driver@test.com');
  console.log('Password: password123');
  console.log('-------------------------');
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});